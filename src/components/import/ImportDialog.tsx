'use client';

import { useState, useRef, useCallback } from 'react';
import { ImportPreview, ImportColumn, Annotation, FieldTemplate, PointStyle } from '@/lib/types';
import { Upload, FileSpreadsheet, MapPin, AlertCircle, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (annotations: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]) => void;
  fieldTemplates: FieldTemplate[];
  mapId: string;
}

export default function ImportDialog({ open, onClose, onImport, fieldTemplates, mapId }: ImportDialogProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'mapping' | 'confirm'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError('');
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('CSV 解析出错：' + results.errors[0].message);
            return;
          }
          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string>[];
          buildPreview(headers, rows);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
          if (jsonData.length === 0) {
            setError('文件为空或格式不正确');
            return;
          }
          const headers = Object.keys(jsonData[0]);
          buildPreview(headers, jsonData);
        } catch (err) {
          setError('Excel 解析出错：' + (err as Error).message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('不支持的文件格式，请上传 .xlsx 或 .csv 文件');
    }
  }, []);

  const buildPreview = (headers: string[], rows: Record<string, string>[]) => {
    // 自动检测经纬度列
    const latKeywords = ['纬度', 'lat', 'latitude', 'y'];
    const lngKeywords = ['经度', 'lng', 'lon', 'longitude', 'x'];
    let autoLat: string | null = null;
    let autoLng: string | null = null;

    headers.forEach((h) => {
      const lower = h.toLowerCase().trim();
      if (latKeywords.some((k) => lower.includes(k))) autoLat = h;
      if (lngKeywords.some((k) => lower.includes(k))) autoLng = h;
    });

    const columns: ImportColumn[] = headers.map((header, index) => {
      const sampleValues = rows.slice(0, 5).map((r) => r[header] || '');
      let mappedField: string | null = null;

      // 自动映射
      const lower = header.toLowerCase().trim();
      if (lower === '名称' || lower === 'name' || lower === '标题' || lower === '编号') mappedField = 'name';
      else if (lower === '描述' || lower === 'description' || lower === '备注' || lower === '位置') mappedField = 'description';
      else if (lower === '纬度' || lower === 'lat' || lower === 'latitude') mappedField = '_lat';
      else if (lower === '经度' || lower === 'lng' || lower === 'lon' || lower === 'longitude') mappedField = '_lng';

      // 映射到自定义字段
      if (!mappedField) {
        const matchedField = fieldTemplates.find(
          (f) => f.name.toLowerCase() === lower || f.name === header
        );
        if (matchedField) mappedField = `custom_${matchedField.id}`;
      }

      return {
        index,
        header,
        mappedField,
        sampleValues,
      };
    });

    setPreview({
      columns,
      rows,
      totalRows: rows.length,
      latColumn: autoLat,
      lngColumn: autoLng,
    });
    setStep('mapping');
  };

  const handleColumnMapping = (colIndex: number, field: string) => {
    if (!preview) return;
    const newColumns = [...preview.columns];
    newColumns[colIndex] = { ...newColumns[colIndex], mappedField: field || null };

    // 更新经纬度列
    let latCol = preview.latColumn;
    let lngCol = preview.lngColumn;
    if (field === '_lat') latCol = newColumns[colIndex].header;
    if (field === '_lng') lngCol = newColumns[colIndex].header;

    setPreview({ ...preview, columns: newColumns, latColumn: latCol, lngColumn: lngCol });
  };

  const handleImport = () => {
    if (!preview || !preview.latColumn || !preview.lngColumn) {
      setError('请先映射经度和纬度列');
      return;
    }

    const annotations: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[] = [];

    preview.rows.forEach((row) => {
      const lat = parseFloat(row[preview.latColumn!]);
      const lng = parseFloat(row[preview.lngColumn!]);

      if (isNaN(lat) || isNaN(lng)) return;

      // 获取名称和描述
      const nameCol = preview.columns.find((c) => c.mappedField === 'name');
      const descCol = preview.columns.find((c) => c.mappedField === 'description');
      const name = nameCol ? row[nameCol.header] : '';
      const description = descCol ? row[descCol.header] : '';

      // 获取自定义字段值
      const customFields = preview.columns
        .filter((c) => c.mappedField?.startsWith('custom_'))
        .map((c) => ({
          fieldId: c.mappedField!.replace('custom_', ''),
          value: row[c.header] || null,
        }));

      annotations.push({
        map_id: mapId,
        type: 'point',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        name: name || `导入点 ${annotations.length + 1}`,
        description,
        style: {
          color: '#EF4444',
          icon: 'map-pin',
          size: 3,
        } as PointStyle,
        custom_fields: customFields,
      });
    });

    onImport(annotations);
    handleClose();
  };

  const handleClose = () => {
    setPreview(null);
    setFileName('');
    setError('');
    setStep('upload');
    onClose();
  };

  if (!open) return null;

  // 构建映射选项 — 自定义字段直接显示字段名，与 Excel 表头一致
  const mappingOptions = [
    { value: '_lat', label: '纬度 (Latitude)' },
    { value: '_lng', label: '经度 (Longitude)' },
    { value: 'name', label: '名称' },
    { value: 'description', label: '描述' },
    ...fieldTemplates.map((f) => ({ value: `custom_${f.id}`, label: f.name })),
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">批量导入标注点</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 步骤 1: 上传 */}
          {step === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">点击或拖拽文件到此处上传</p>
              <p className="text-sm text-gray-400">支持 .xlsx, .csv 格式</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
            </div>
          )}

          {/* 步骤 2: 字段映射 */}
          {step === 'mapping' && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{fileName}</span>
                <span className="text-gray-400">·</span>
                <span>{preview.totalRows} 行数据</span>
              </div>

              {!preview.latColumn || !preview.lngColumn ? (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">需要映射经纬度列</p>
                    <p className="mt-1 text-yellow-600">请在下方为"纬度"和"经度"选择对应的列，否则无法在地图上标注位置。</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>已自动识别经纬度列：{preview.latColumn} / {preview.lngColumn}</span>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">列映射</h3>
                {preview.columns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{col.header}</p>
                      <p className="text-xs text-gray-500 truncate">
                        示例: {col.sampleValues.slice(0, 3).join(', ')}
                      </p>
                    </div>
                    <select
                      value={col.mappedField || ''}
                      onChange={(e) => handleColumnMapping(idx, e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm w-40"
                    >
                      <option value="">不映射</option>
                      {mappingOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        {step === 'mapping' && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <button
              onClick={() => { setStep('upload'); setPreview(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              返回上传
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!preview?.latColumn || !preview?.lngColumn}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                导入 {preview?.totalRows || 0} 个标注点
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="px-6 py-3 bg-red-50 text-red-700 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
