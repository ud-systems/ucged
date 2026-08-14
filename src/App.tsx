import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import QueuePage from "@/pages/QueuePage";
import DashboardPage from "@/pages/DashboardPage";
import SettingsPage from "@/pages/SettingsPage";
import CustomerPage from "@/pages/CustomerPage";
import OrderPage from "@/pages/OrderPage";
import FollowUpsPage from "@/pages/FollowUpsPage";
import OrdersBrowsePage from "@/pages/OrdersBrowsePage";
import TemplatesPage from "@/pages/TemplatesPage";
import CampaignsPage from "@/pages/CampaignsPage";
import CampaignDetailPage from "@/pages/CampaignDetailPage";
import MailInboxPage from "@/pages/MailInboxPage";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1 } },
});

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CapabilityRoute({
  capability,
  children,
}: {
  capability: Parameters<ReturnType<typeof useAuth>["hasCapability"]>[0];
  children: React.ReactNode;
}) {
  const { hasCapability } = useAuth();
  if (!hasCapability(capability)) return <Navigate to="/queue" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <Protected>
                  <AppShell />
                </Protected>
              }
            >
              <Route index element={<Navigate to="/queue" replace />} />
              <Route path="queue" element={<QueuePage />} />
              <Route path="queue/:segmentSlug" element={<QueuePage />} />
              <Route
                path="follow-ups"
                element={
                  <CapabilityRoute capability="view_followups">
                    <FollowUpsPage />
                  </CapabilityRoute>
                }
              />
              <Route
                path="inbox"
                element={
                  <CapabilityRoute capability="view_mail_inbox">
                    <MailInboxPage />
                  </CapabilityRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <CapabilityRoute capability="view_orders">
                    <OrdersBrowsePage />
                  </CapabilityRoute>
                }
              />
              <Route path="orders/:orderId" element={<OrderPage />} />
              <Route path="customers/:customerId" element={<CustomerPage />} />
              <Route
                path="templates"
                element={
                  <CapabilityRoute capability="manage_templates">
                    <TemplatesPage />
                  </CapabilityRoute>
                }
              />
              <Route
                path="campaigns"
                element={
                  <CapabilityRoute capability="manage_campaigns">
                    <CampaignsPage />
                  </CapabilityRoute>
                }
              />
              <Route
                path="campaigns/:campaignId"
                element={
                  <CapabilityRoute capability="manage_campaigns">
                    <CampaignDetailPage />
                  </CapabilityRoute>
                }
              />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="assignments" element={<Navigate to="/settings?tab=assignments" replace />} />
              <Route path="sync" element={<Navigate to="/settings?tab=sync" replace />} />
              <Route
                path="settings"
                element={
                  <CapabilityRoute capability="manage_settings">
                    <SettingsPage />
                  </CapabilityRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/queue" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
