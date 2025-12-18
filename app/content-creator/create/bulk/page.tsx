"use client";

import BulkUploadPage from "@/components/BulkUploadPage";

export default function BulkUploadQuestionPage() {
  return (
    <BulkUploadPage
      userRole="Content Creator"
      apiEndpoint="/api/oup-creator/questions"
      userRoleParam="content_creator"
    />
  );
}
