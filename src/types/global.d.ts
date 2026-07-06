declare type PagesFunction<TEnv = Record<string, unknown>> = (context: {
  request: Request;
  env: TEnv;
}) => Response | Promise<Response>;
