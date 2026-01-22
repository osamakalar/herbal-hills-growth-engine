import { useState, useEffect } from 'react';
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
import { useSetTarget, type TargetWithProgress } from '@/hooks/useTargets';
import { Target } from 'lucide-react';
import { format, parse } from 'date-fns';

interface EditTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TargetWithProgress | null;
}

export function EditTargetDialog({ open, onOpenChange, target }: EditTargetDialogProps) {
  const [targetAmount, setTargetAmount] = useState<string>('');
  const setTargetMutation = useSetTarget();

  useEffect(() => {
    if (target) {
      setTargetAmount(target.target_amount_pkr.toString());
    }
  }, [target]);

  const handleSubmit = async () => {
    if (!target || !targetAmount) return;

    await setTargetMutation.mutateAsync({
      userId: target.user_id,
      month: parse(target.month, 'yyyy-MM-dd', new Date()),
      targetAmount: parseFloat(targetAmount),
    });

    onOpenChange(false);
  };

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Edit Target
          </DialogTitle>
          <DialogDescription>
            Update target for <strong>{target.full_name}</strong> for {format(parse(target.month, 'yyyy-MM-dd', new Date()), 'MMMM yyyy')}.
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

          {/* Current Progress */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Achievement</span>
              <span className="font-medium">
                ₨{target.achieved_amount.toLocaleString('en-PK')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New Progress</span>
              <span className="font-bold text-primary">
                {targetAmount ? ((target.achieved_amount / parseFloat(targetAmount)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!targetAmount || setTargetMutation.isPending}
          >
            {setTargetMutation.isPending ? 'Saving...' : 'Save Target'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
