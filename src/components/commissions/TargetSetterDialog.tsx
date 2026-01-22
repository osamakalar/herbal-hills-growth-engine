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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useSetTarget } from '@/hooks/useCommissions';
import { Target } from 'lucide-react';

interface TargetSetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: Date;
}

export function TargetSetterDialog({ open, onOpenChange, month }: TargetSetterDialogProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('100000');
  
  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers();
  const setTarget = useSetTarget();

  const healthReps = teamMembers?.filter(m => m.role === 'health_rep') || [];

  const handleSubmit = async () => {
    if (!selectedUser || !targetAmount) return;

    await setTarget.mutateAsync({
      userId: selectedUser,
      month,
      targetAmount: parseFloat(targetAmount),
    });

    onOpenChange(false);
    setSelectedUser('');
    setTargetAmount('100000');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Set Monthly Target
          </DialogTitle>
          <DialogDescription>
            Set a sales target for a health representative for {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Health Representative</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select a representative" />
              </SelectTrigger>
              <SelectContent>
                {loadingTeam ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : healthReps.length === 0 ? (
                  <SelectItem value="" disabled>No health reps found</SelectItem>
                ) : (
                  healthReps.map((rep) => (
                    <SelectItem key={rep.user_id} value={rep.user_id}>
                      {rep.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

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
            <p className="text-xs text-muted-foreground">
              Commission releases at 90% ({new Intl.NumberFormat('en-PK').format(parseFloat(targetAmount || '0') * 0.9)} PKR)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedUser || !targetAmount || setTarget.isPending}
          >
            {setTarget.isPending ? 'Setting...' : 'Set Target'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
