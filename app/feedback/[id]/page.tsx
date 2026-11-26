"use client";

import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/page-container";
import TicketDetailWorkspace from "@/components/ticket-detail-workspace";

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <PageContainer>
      <TicketDetailWorkspace
        feedbackId={params.id}
        surfaceMode="page"
        onOpenTicket={(nextId) => router.push(`/feedback/${nextId}`)}
      />
    </PageContainer>
  );
}
