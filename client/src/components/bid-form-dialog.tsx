import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BidSettings } from "@shared/schema";
import { AlertCircle } from "lucide-react";
import rawabtLogo from "@assets/IMG_3732_1758355775580.png";

const bidFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  position: z.string().min(1, "Position is required"),
  organizationName: z.string().min(1, "Organization/Sponsor name is required"),
  contactInfo: z.string().min(1, "Contact information is required"),
  amount: z.string().min(1, "Amount is required").transform((val) => val), // Keep as string for backend
  duration: z.number().min(1, "Duration must be at least 1 month"),
  visibilityRights: z.string().min(1, "Visibility rights are required"),
  message: z.string().optional(),
});

type BidFormData = z.infer<typeof bidFormSchema>;

interface BidFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: number;
  athleteName: string;
}

export function BidFormDialog({
  open,
  onOpenChange,
  athleteId,
  athleteName,
}: BidFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch bid settings to check if bids are accepted
  const { data: bidSettings, isLoading: settingsLoading } = useQuery<BidSettings>({
    queryKey: ['/api/bid-settings'],
    enabled: open, // Only fetch when dialog is open
  });

  const form = useForm<BidFormData>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      fullName: "",
      position: "",
      organizationName: "",
      contactInfo: "",
      amount: "",
      duration: 12,
      visibilityRights: "",
      message: "",
    },
  });

  const createBidMutation = useMutation({
    mutationFn: async (data: BidFormData) => {
      return apiRequest("POST", `/api/athletes/${athleteId}/bids`, data);
    },
    onSuccess: () => {
      toast({
        title: "Bid submitted successfully",
        description: `Your sponsorship bid for ${athleteName} has been submitted and is pending approval.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/athletes", athleteId, "bids"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes-with-bids"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit bid",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidFormData) => {
    createBidMutation.mutate(data);
  };

  const bidsDisabled = bidSettings && !bidSettings.bidsAccepted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="bid-form-dialog">
        <div className="flex justify-center mb-4">
          <img 
            src={rawabtLogo} 
            alt="Rawabt Sports Logo" 
            className="h-16 w-auto"
            data-testid="rawabt-logo"
          />
        </div>
        <DialogHeader>
          <DialogTitle>Submit Sponsorship Bid</DialogTitle>
          <DialogDescription>
            Submit a sponsorship bid for {athleteName}. Your bid will be
            reviewed and you'll be notified of the athlete's decision.
          </DialogDescription>
        </DialogHeader>

        {bidsDisabled && (
          <Alert variant="destructive" data-testid="alert-bids-disabled">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {bidSettings.rejectionMessage || "We are not accepting new sponsorship bids at this time. Please check back later."}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your full name"
                      data-testid="input-full-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Position</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your position/title"
                      data-testid="input-position"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Organization / Sponsor Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter organization or sponsor name"
                      data-testid="input-organization-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Information</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email, phone, or other contact details"
                      data-testid="input-contact-info"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (EGP)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Enter sponsorship amount"
                      data-testid="input-amount"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      placeholder="Enter duration in months"
                      data-testid="input-duration"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibilityRights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility Rights</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Logo on uniform, social media mentions"
                      data-testid="input-visibility-rights"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to your sponsorship proposal"
                      className="resize-none"
                      data-testid="textarea-message"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBidMutation.isPending || bidsDisabled || settingsLoading}
                data-testid="button-submit-bid"
              >
                {createBidMutation.isPending ? "Submitting..." : "Submit Bid"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
