
interface TelemetryFooterProps {
  operationLogs: string[];
}

export function TelemetryFooter({ operationLogs }: TelemetryFooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-10 z-40 bg-surface/90 backdrop-blur-md border-t border-outline-variant/30 flex items-center justify-between px-8 shadow-inner" id="main-footer">
      <div className="flex items-center gap-4">
        <span className="font-orbitron text-[9px] text-on-surface uppercase tracking-widest flex items-center gap-1.5 font-black shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-status-go animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
          Telemetry Stream
        </span>
        <div className="overflow-hidden whitespace-nowrap w-[400px] md:w-[700px] text-outline text-[10px] font-medium font-mono select-none">
          <div className="inline-block animate-marquee whitespace-nowrap">
            {operationLogs.map((log, idx) => (
              <span key={idx} className="mr-8">» {log}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-[9px] text-outline shrink-0 font-mono uppercase tracking-wider font-bold">
        <span>CrowdIQ Operations Terminal</span>
      </div>
    </footer>
  );
}
