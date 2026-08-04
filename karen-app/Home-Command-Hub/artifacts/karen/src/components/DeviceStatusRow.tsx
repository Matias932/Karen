import React from 'react';
import { useListDevices, useGetDeviceStatus } from '@workspace/api-client-react';
import { Tv, Gamepad2, Smartphone, Wifi, WifiOff } from 'lucide-react';

function DeviceStatusItem({ device }: { device: any }) {
  const { data: status } = useGetDeviceStatus(device.id, { query: { refetchInterval: 10000 } });
  
  const isOnline = status?.online;

  let Icon = Tv;
  if (device.type === 'ps5') Icon = Gamepad2;
  if (device.type === 'android_tv') Icon = Smartphone;

  return (
    <div className="flex items-center justify-between p-3 border border-border bg-card/40 rounded-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-sm bg-background border ${isOnline ? 'border-secondary/50 text-secondary' : 'border-muted text-muted-foreground'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-mono text-sm tracking-wide text-foreground">{device.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase">{device.type.replace('_', ' ')}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 font-mono text-xs">
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3 text-secondary" />
            <span className="text-secondary">ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">OFFLINE</span>
          </>
        )}
      </div>
    </div>
  );
}

export function DeviceStatusRow() {
  const { data: devices } = useListDevices();
  
  if (!devices || devices.length === 0) return null;

  const activeDevices = devices.filter(d => d.isActive);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {activeDevices.map(device => (
        <DeviceStatusItem key={device.id} device={device} />
      ))}
    </div>
  );
}
