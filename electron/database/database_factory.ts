import { DatabaseType } from "../llm/llm_types_and_interfaces/types";
import { SQLLiteAdapter } from "./adapters/sqllite_adapter";
import { DatabaseConfig, SQLiteConfig } from "./idatabase";



export class DatabaseFactory{
    static createConnection(databaseType:DatabaseType,config:DatabaseConfig | SQLiteConfig){DatabaseType
        switch(databaseType){
            case DatabaseType.SQLLite:
                return new SQLLiteAdapter(config as SQLiteConfig);
            default:
                throw new Error(`Unsupported database type :${databaseType}`);
      
        }
    }

    static async createAndConnect(databaseType:DatabaseType,config:DatabaseConfig | SQLiteConfig){
        const adapter=DatabaseFactory.createConnection(databaseType,config);
        await adapter.connect();
        return adapter;

        
    }
}