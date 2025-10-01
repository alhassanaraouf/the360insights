import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Trash2, Save, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AccountSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: ''
  });
  const [originalProfileData, setOriginalProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Update profile data when user data is loaded
  useEffect(() => {
    if (user) {
      const userData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        bio: user.bio || ''
      };
      setProfileData(userData);
      setOriginalProfileData(userData);
    }
  }, [user]);

  // Check if profile has changes
  const hasProfileChanges = JSON.stringify(profileData) !== JSON.stringify(originalProfileData);

  // Check if password form has content
  const hasPasswordData = passwordData.newPassword.length > 0 || passwordData.confirmPassword.length > 0;

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await apiRequest('PUT', '/api/auth/profile', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Update original data to reflect saved state
      setOriginalProfileData(profileData);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      return await apiRequest('PUT', '/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/auth/delete-account');
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Account Deletion Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Manage your account information, security settings, and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="danger">Account Management</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        firstName: e.target.value
                      }))}
                      placeholder="Enter your first name"
                      disabled={updateProfileMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        lastName: e.target.value
                      }))}
                      placeholder="Enter your last name"
                      disabled={updateProfileMutation.isPending}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    placeholder="Enter your email address"
                    disabled={updateProfileMutation.isPending}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      bio: e.target.value
                    }))}
                    placeholder="Tell us about yourself..."
                    disabled={updateProfileMutation.isPending}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {profileData.bio.length}/200 characters
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending || !hasProfileChanges}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{updateProfileMutation.isPending ? "Saving..." : "Save Changes"}</span>
                  </Button>
                  {!hasProfileChanges && (
                    <span className="text-sm text-gray-500">No changes to save</span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))}
                      placeholder="Enter your current password"
                      disabled={changePasswordMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }))}
                      placeholder="Enter your new password"
                      minLength={6}
                      disabled={changePasswordMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))}
                      placeholder="Confirm your new password"
                      disabled={changePasswordMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending || !hasPasswordData}
                    className="flex items-center space-x-2"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{changePasswordMutation.isPending ? "Updating..." : "Update Password"}</span>
                  </Button>
                  {!hasPasswordData && (
                    <span className="text-sm text-gray-500">Enter new password to update</span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  What happens when you delete your account:
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>All your personal data will be permanently deleted</li>
                  <li>Your training history and performance data will be removed</li>
                  <li>You will lose access to all AI insights and recommendations</li>
                  <li>This action cannot be reversed</li>
                </ul>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="flex items-center space-x-2"
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Account</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Yes, delete my account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}