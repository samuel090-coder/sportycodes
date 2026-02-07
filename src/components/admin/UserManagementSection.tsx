import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, Search, Shield, Ban, CheckCircle, 
  AlertTriangle, Eye, Wallet, Trophy, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_earned: number | null;
  referral_earnings: number | null;
  followers_count: number | null;
  created_at: string;
}

interface UserWithWallet extends UserProfile {
  wallet_balance?: number;
  role?: string;
}

export const UserManagementSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (searchQuery) {
        query = query.or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Get wallet balances and roles for these users
      const usersWithDetails = await Promise.all(
        (data || []).map(async (user) => {
          const { data: walletData } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

          return {
            ...user,
            wallet_balance: walletData?.balance || 0,
            role: roleData?.role || "user"
          };
        })
      );

      setUsers(usersWithDetails);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // First check if role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole as "admin" | "moderator" | "user" })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole as "admin" | "moderator" | "user" });
        if (error) throw error;
      }
      
      toast.success(`User role updated to ${newRole}`);
      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const adjustWalletBalance = async (userId: string, amount: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newBalance = (user.wallet_balance || 0) + amount;
      
      const { error } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(`Wallet adjusted by ₦${amount}`);
      loadUsers();
    } catch (error) {
      console.error("Error adjusting wallet:", error);
      toast.error("Failed to adjust wallet");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-red-500/20 text-red-400">Admin</Badge>;
      case "moderator": return <Badge className="bg-blue-500/20 text-blue-400">Moderator</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400">User</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === "admin").length}
              </p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                ₦{users.reduce((sum, u) => sum + (u.wallet_balance || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total in Wallets</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                ₦{users.reduce((sum, u) => sum + (u.total_earned || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or username..."
              className="pl-10 bg-background border-border"
            />
          </div>
          <Button variant="outline" onClick={loadUsers}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          User Management
        </h3>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Total Earned</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt="" 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-bold">
                              {(user.display_name || user.username || "U")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {user.display_name || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{user.username || "unknown"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="h-8 px-2 rounded border border-border bg-background text-foreground text-sm"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-green-500 font-medium">
                      ₦{(user.wallet_balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      ₦{(user.total_earned || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{user.followers_count || 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const amount = prompt("Enter amount to add (negative to subtract):");
                            if (amount) {
                              adjustWalletBalance(user.id, parseFloat(amount));
                            }
                          }}
                          className="text-green-500 text-xs"
                        >
                          <Wallet className="w-3 h-3 mr-1" />
                          Adjust
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
