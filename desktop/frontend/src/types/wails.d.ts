export interface ServiceInfo {
  name: string;
  status: string;
  port: number;
  uptime: string;
  uptimeSec: number;
  cmd: string;
  color: string;
  pid: number;
}

export interface LogEntry {
  service: string;
  text: string;
  isStderr: boolean;
  timestamp: string;
}

export interface AddServiceInput {
  name: string;
  cmd: string;
  dir: string;
  port: number;
  color: string;
  env: Record<string, string>;
  dependsOn: string[];
  healthUrl: string;
  healthCmd: string;
}

export interface DetectedService {
  name: string;
  cmd: string;
  dir: string;
  port: number;
  color: string;
  source: string;
  dependsOn: string[];
}

declare global {
  interface Window {
    go: {
      desktop: {
        App: {
          GetServices(): Promise<ServiceInfo[]>;
          GetLogs(limit: number): Promise<LogEntry[]>;
          GetLogsForService(service: string, limit: number): Promise<LogEntry[]>;
          IsRunning(): Promise<boolean>;
          GetProjectName(): Promise<string>;
          HasConfig(): Promise<boolean>;
          StartAll(): Promise<void>;
          StopAll(): Promise<void>;
          RestartService(name: string): Promise<void>;
          StopService(name: string): Promise<void>;
          StartService(name: string): Promise<void>;
          AddService(input: AddServiceInput): Promise<void>;
          RemoveService(name: string): Promise<void>;
          UpdateService(name: string, input: AddServiceInput): Promise<void>;
          LoadConfig(path: string): Promise<any>;
          InitConfig(dir: string): Promise<void>;
          GetConfigPath(): Promise<string>;
          GetConfigRaw(): Promise<string>;
          SelectDirectory(): Promise<string>;
          ScanDirectory(dir: string): Promise<DetectedService[]>;
          ImportDetected(services: DetectedService[]): Promise<void>;
          GenerateDemo(dir: string): Promise<void>;
        };
      };
    };
  }
}
