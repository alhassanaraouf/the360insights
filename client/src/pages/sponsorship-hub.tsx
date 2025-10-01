import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SponsorshipBid, Athlete } from "@shared/schema";
import { 
  DollarSign, 
  Calendar, 
  Eye, 
  MessageSquare, 
  User,
  Clock,
  Check,
  X,
  Star
} from "lucide-react";

interface AthleteWithBids extends Athlete {
  bidsCount: number;
}

interface ExtendedSponsorshipBid extends SponsorshipBid {
  athlete?: Athlete;
}

export default function SponsorshipHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteWithBids | null>(null);
  const [bidDetailsOpen, setBidDetailsOpen] = useState(false);

  // Fetch athletes with bids
  const { data: athletesWithBids, isLoading: athletesLoading } = useQuery<AthleteWithBids[]>({
    queryKey: ['/api/athletes-with-bids'],
  });

  // Fetch bids for selected athlete
  const { data: athleteBids, isLoading: bidsLoading } = useQuery<SponsorshipBid[]>({
    queryKey: [`/api/athletes/${selectedAthlete?.id}/bids`],
    enabled: !!selectedAthlete?.id,
  });

  // Update bid status mutation
  const updateBidStatusMutation = useMutation({
    mutationFn: async ({ bidId, status }: { bidId: number, status: 'ACCEPTED' | 'REJECTED' }) => {
      return apiRequest('PATCH', `/api/bids/${bidId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Bid status updated",
        description: "The sponsorship bid status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/athletes/${selectedAthlete?.id}/bids`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update bid status",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewBids = (athlete: AthleteWithBids) => {
    setSelectedAthlete(athlete);
    setBidDetailsOpen(true);
  };

  const handleUpdateBidStatus = (bidId: number, status: 'ACCEPTED' | 'REJECTED') => {
    updateBidStatusMutation.mutate({ bidId, status });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (athletesLoading) {
    return (
      <>
        <Header 
          title="Sponsorship Hub" 
          description="Manage sponsorship bids and partnerships"
        />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Sponsorship Hub" 
        description="Manage sponsorship bids and partnerships"
      />
      <div className="p-6">
        {!athletesWithBids || athletesWithBids.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sponsorship bids yet</h3>
              <p className="text-gray-500">Athletes with sponsorship bids will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {athletesWithBids.map((athlete) => (
              <Card key={athlete.id} className="hover:shadow-md transition-shadow" data-testid={`athlete-card-${athlete.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage 
                          src={athlete.profileImage || undefined} 
                          alt={athlete.name}
                        />
                        <AvatarFallback>
                          {athlete.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid={`text-athlete-name-${athlete.id}`}>
                          {athlete.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {athlete.nationality}
                          </span>
                          <span>{athlete.sport}</span>
                          {athlete.gender && (
                            <Badge variant="outline" className="text-xs">
                              {athlete.gender}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600" data-testid={`text-bids-count-${athlete.id}`}>
                          {athlete.bidsCount}
                        </div>
                        <div className="text-xs text-gray-500">
                          {athlete.bidsCount === 1 ? 'Bid' : 'Bids'}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleViewBids(athlete)}
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-bids-${athlete.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Bids
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bid Details Dialog */}
        <Dialog open={bidDetailsOpen} onOpenChange={setBidDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="bid-details-dialog">
            <DialogHeader>
              <DialogTitle>
                Sponsorship Bids for {selectedAthlete?.name}
              </DialogTitle>
              <DialogDescription>
                Review and manage sponsorship bids for this athlete.
              </DialogDescription>
            </DialogHeader>

            {bidsLoading ? (
              <div className="animate-pulse space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : !athleteBids || athleteBids.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No bids found for this athlete.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {athleteBids.map((bid) => (
                  <Card key={bid.id} className="border-l-4 border-l-blue-500" data-testid={`bid-card-${bid.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center space-x-4">
                            <Badge className={getStatusBadgeColor(bid.status)} data-testid={`badge-status-${bid.id}`}>
                              {bid.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>

                          {/* Sponsor Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="text-sm text-gray-500">Sponsor Name</div>
                                <div className="font-semibold" data-testid={`text-sponsor-name-${bid.id}`}>
                                  {bid.fullName}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="text-sm text-gray-500">Position</div>
                                <div className="font-semibold" data-testid={`text-position-${bid.id}`}>
                                  {bid.position}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="text-sm text-gray-500">Organization</div>
                                <div className="font-semibold" data-testid={`text-organization-${bid.id}`}>
                                  {bid.organizationName}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="text-sm text-gray-500">Contact Information</div>
                                <div className="font-semibold text-sm" data-testid={`text-contact-${bid.id}`}>
                                  {bid.contactInfo}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bid Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-5 h-5 text-green-600" />
                              <div>
                                <div className="text-sm text-gray-500">Amount</div>
                                <div className="font-semibold" data-testid={`text-amount-${bid.id}`}>
                                  ${Number(bid.amount).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <div>
                                <div className="text-sm text-gray-500">Duration</div>
                                <div className="font-semibold" data-testid={`text-duration-${bid.id}`}>
                                  {bid.duration} months
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Eye className="w-5 h-5 text-purple-600" />
                              <div>
                                <div className="text-sm text-gray-500">Visibility Rights</div>
                                <div className="font-semibold text-sm" data-testid={`text-visibility-${bid.id}`}>
                                  {bid.visibilityRights}
                                </div>
                              </div>
                            </div>
                          </div>

                          {bid.message && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                              <div className="text-sm text-gray-500 mb-1">Message</div>
                              <p className="text-sm" data-testid={`text-message-${bid.id}`}>
                                {bid.message}
                              </p>
                            </div>
                          )}
                        </div>

                        {bid.status === 'PENDING' && (
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateBidStatus(bid.id, 'ACCEPTED')}
                              disabled={updateBidStatusMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-accept-${bid.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBidStatus(bid.id, 'REJECTED')}
                              disabled={updateBidStatusMutation.isPending}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              data-testid={`button-reject-${bid.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        
                        {bid.status === 'ACCEPTED' && (
                          <div className="ml-4">
                            <div className="bg-green-50 text-green-800 px-3 py-2 rounded-lg text-sm font-medium flex items-center" data-testid={`status-accepted-${bid.id}`}>
                              <Check className="w-4 h-4 mr-2" />
                              Offer is accepted
                            </div>
                          </div>
                        )}
                        
                        {bid.status === 'REJECTED' && (
                          <div className="ml-4">
                            <div className="bg-red-50 text-red-800 px-3 py-2 rounded-lg text-sm font-medium flex items-center" data-testid={`status-rejected-${bid.id}`}>
                              <X className="w-4 h-4 mr-2" />
                              Offer is rejected
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}