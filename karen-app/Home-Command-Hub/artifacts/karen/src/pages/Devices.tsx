import React, { useState } from 'react';
import { 
  useListDevices, 
  useCreateDevice, 
  useUpdateDevice, 
  useDeleteDevice, 
  useGetDeviceStatus,
  useListRokuApps
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tv, Gamepad2, Smartphone, Wifi, WifiOff, Settings2, Trash2, Plus, AppWindow, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"

type DeviceInputType = 'roku' | 'android_tv' | 'ps5';

export function Devices() {
  const { data: devices, refetch } = useListDevices();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="p-4 max-w-7xl mx-auto w-full min-h-[calc(100vh-4rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-mono text-xl text-primary font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,42,42,0.8)]">DEVICE_CONFIG</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">Manage linked hardware nodes</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="hud" className="gap-2">
              <Plus className="w-4 h-4" /> ADD_NODE
            </Button>
          </DialogTrigger>
          <DialogContent className="border-primary/50 bg-card hud-glow-red font-mono rounded-none">
            <DialogHeader>
              <DialogTitle className="text-primary tracking-widest">INITIALIZE_NEW_DEVICE</DialogTitle>
            </DialogHeader>
            <DeviceForm onSuccess={() => { setIsAddOpen(false); refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {devices?.map(device => (
          <DeviceCard key={device.id} device={device} onUpdate={refetch} />
        ))}
        {devices?.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-muted-foreground/30 text-muted-foreground font-mono">
            NO_DEVICES_DETECTED. INITIALIZE A NODE TO CONTINUE.
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceCard({ device, onUpdate }: { device: any, onUpdate: () => void }) {
  const { data: status } = useGetDeviceStatus(device.id, { query: { refetchInterval: 10000 } });
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  const { toast } = useToast();
  const isOnline = status?.online;
  const [expanded, setExpanded] = useState(false);

  const toggleActive = () => {
    updateDevice.mutate({ id: device.id, data: { isActive: !device.isActive } }, {
      onSuccess: () => {
        toast({ title: "SYS_MSG", description: `Device ${!device.isActive ? 'activated' : 'deactivated'}` });
        onUpdate();
      }
    });
  };

  const removeDevice = () => {
    if (confirm(`PURGE NODE [${device.name}]? THIS ACTION IS IRREVERSIBLE.`)) {
      deleteDevice.mutate({ id: device.id }, {
        onSuccess: () => {
          toast({ title: "SYS_MSG", description: "Node purged successfully" });
          onUpdate();
        }
      });
    }
  };

  let Icon = Tv;
  if (device.type === 'ps5') Icon = Gamepad2;
  if (device.type === 'android_tv') Icon = Smartphone;

  return (
    <div className={cn(
      "border bg-card/20 rounded-md overflow-hidden transition-all duration-300 flex flex-col",
      device.isActive ? "border-primary/30 hud-glow" : "border-border/50 opacity-60"
    )}>
      <div className="p-4 flex items-start justify-between border-b border-border/50 bg-black/20">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-sm border",
            device.isActive ? "border-primary/50 text-primary bg-primary/10" : "border-muted text-muted-foreground bg-muted/10"
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-mono text-lg font-bold text-foreground tracking-wider">{device.name}</h3>
            <div className="flex items-center gap-3 font-mono text-xs mt-1">
              <span className="text-secondary">{device.type.toUpperCase()}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{device.ipAddress}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold">
            {isOnline ? (
              <span className="text-secondary flex items-center gap-1"><Wifi className="w-3 h-3" /> ON</span>
            ) : (
              <span className="text-destructive flex items-center gap-1"><WifiOff className="w-3 h-3" /> OFF</span>
            )}
          </div>
          <button 
            onClick={toggleActive}
            className={cn(
              "font-mono text-[10px] px-2 py-0.5 border rounded-sm transition-colors",
              device.isActive ? "border-primary text-primary hover:bg-primary/20" : "border-muted-foreground text-muted-foreground hover:bg-muted"
            )}
          >
            {device.isActive ? 'DISABLE_NODE' : 'ENABLE_NODE'}
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <span className="text-muted-foreground block mb-1">MAC_ADDRESS:</span>
            <span className="text-foreground">{device.macAddress || 'UNAVAILABLE'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">PORT:</span>
            <span className="text-foreground">{device.port || 'DEFAULT'}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-auto pt-4 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={removeDevice} className="text-destructive hover:text-destructive hover:bg-destructive/10 font-mono text-xs">
            <Trash2 className="w-4 h-4 mr-2" /> PURGE
          </Button>

          {device.type === 'roku' && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-secondary hover:text-secondary hover:bg-secondary/10 font-mono text-xs">
              <AppWindow className="w-4 h-4 mr-2" /> APPS {expanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>

      {device.type === 'roku' && expanded && (
        <RokuAppsList deviceId={device.id} />
      )}
    </div>
  );
}

function RokuAppsList({ deviceId }: { deviceId: number }) {
  const { data: apps, isLoading } = useListRokuApps(deviceId);

  return (
    <div className="p-4 bg-black/40 border-t border-border/50 font-mono text-xs animate-in slide-in-from-top-2">
      <h4 className="text-secondary mb-3 flex items-center gap-2"><AppWindow className="w-3 h-3" /> INSTALLED_APPLICATIONS</h4>
      {isLoading ? (
        <div className="text-muted-foreground">SCANNING...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {apps?.map(app => (
            <div key={app.id} className="p-2 border border-border/50 bg-card rounded-sm truncate text-foreground hover:border-secondary/50 transition-colors cursor-default" title={app.name}>
              {app.name}
            </div>
          ))}
          {apps?.length === 0 && <div className="text-muted-foreground col-span-full">NO APPS FOUND</div>}
        </div>
      )}
    </div>
  );
}

function DeviceForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      type: 'roku' as DeviceInputType,
      ipAddress: '',
      macAddress: '',
      port: ''
    }
  });
  
  const createDevice = useCreateDevice();
  const { toast } = useToast();

  const onSubmit = (data: any) => {
    createDevice.mutate({ 
      data: {
        ...data,
        port: data.port ? parseInt(data.port, 10) : undefined,
        isActive: true
      }
    }, {
      onSuccess: () => {
        toast({ title: "SYS_MSG", description: "Node initialized successfully." });
        onSuccess();
      },
      onError: (err) => {
        toast({ title: "SYS_ERR", description: "Failed to initialize node.", variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-mono">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-primary text-xs">NODE_NAME</Label>
        <Input id="name" {...register('name', { required: true })} className="bg-black/50 border-primary/30 focus-visible:ring-primary" placeholder="LIVING ROOM TV" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type" className="text-primary text-xs">NODE_TYPE</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="bg-black/50 border-primary/30 focus:ring-primary">
                <SelectValue placeholder="SELECT TYPE" />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/50 font-mono">
                <SelectItem value="roku">ROKU</SelectItem>
                <SelectItem value="android_tv">ANDROID TV</SelectItem>
                <SelectItem value="ps5">PLAYSTATION 5</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ipAddress" className="text-primary text-xs">IPV4_ADDRESS</Label>
        <Input id="ipAddress" {...register('ipAddress', { required: true })} className="bg-black/50 border-primary/30 focus-visible:ring-primary" placeholder="192.168.1.X" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="macAddress" className="text-primary text-xs">MAC_ADDRESS (OPTIONAL)</Label>
          <Input id="macAddress" {...register('macAddress')} className="bg-black/50 border-primary/30 focus-visible:ring-primary" placeholder="XX:XX:XX:XX:XX:XX" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port" className="text-primary text-xs">PORT (OPTIONAL)</Label>
          <Input id="port" type="number" {...register('port')} className="bg-black/50 border-primary/30 focus-visible:ring-primary" placeholder="8060" />
        </div>
      </div>

      <Button type="submit" variant="hud" className="w-full mt-6" disabled={createDevice.isPending}>
        {createDevice.isPending ? 'INITIALIZING...' : 'INITIALIZE_NODE'}
      </Button>
    </form>
  );
}
