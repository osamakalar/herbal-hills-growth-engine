import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBulkSetTargets } from '@/hooks/useTargets';
import { Users, Target } from 'lucide-react';
import { format } from 'date-fns';

interface BulkTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: Date;
}

export function BulkTargetDialog({ open, onOpenChange, month }: BulkTargetDialogProps) {
  const [targetAmount, setTargetAmount] = useState<string>('100000');
  const bulkSetTargets = useBulkSetTargets();

  const handleSubmit = async () => {
    if (!targetAmount) return;

    await bulkSetTargets.mutateAsync({
      month,
      targetAmount: parseFloat(targetAmount),
    });

    onOpenChange(false);
    setTargetAmount('100000');
  };

  const presets = [50000, 100000, 150000, 200000, 250000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Assign Targets
          </DialogTitle>
          <DialogDescription>
            Set the same target for all health representatives for {format(month, 'MMMM yyyy')}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target">Target Amount (PKR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₨</span>
              <Input
                id="target"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pl-8"
                min="0"
                step="10000"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={targetAmount === preset.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTargetAmount(preset.toString())}
                >
                  ₨{(preset / 1000).toFixed(0)}K
                </Button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Target className="h-4 w-4 mt-0.5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Commission Thresholds</p>
              <p className="text-muted-foreground text-xs mt-1">
                90% ({new Intl.NumberFormat('en-PK').format(parseFloat(targetAmount || '0') * 0.9)} PKR) - Commission Released
                <br />
                150% ({new Intl.NumberFormat('en-PK').format(parseFloat(targetAmount || '0') * 1.5)} PKR) - Family Dinner Reward
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!targetAmount || bulkSetTargets.isPending}
          >
            {bulkSetTargets.isPending ? 'Assigning...' : 'Assign to All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
