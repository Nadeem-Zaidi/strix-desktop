export interface SQLiteConfig {
  database: string;       // file path e.g. '/data/app.db' or ':memory:'
  connectionTimeout?: number;
}

export interface RemoteDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  maxConnections?: number;
}

export type DatabaseConfig = SQLiteConfig | RemoteDatabaseConfig;

export const isRemoteConfig = (config: DatabaseConfig): config is RemoteDatabaseConfig => {
  return 'host' in config;
};

export interface QueryResult<T=any>{
    rows:T[];
    rowCount:number;
    fields?:string[];
}

export interface IDatabaseAdapter{
    connect():Promise<void>
    disconnect():Promise<void>
    query<T=any>(sql:string,params?:any[]):Promise<QueryResult<T>>;
    beginTransaction():Promise<void>;
    commit():Promise<void>
    rollback():Promise<void>;
    isConnected():boolean;
    getType():string;
    getRawDb(): unknown;
}