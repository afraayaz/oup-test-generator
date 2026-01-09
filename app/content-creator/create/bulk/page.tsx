"use client";

import { Suspense } from "react";
import BulkUploadPage from "@/components/BulkUploadPage";

export default function BulkUploadQuestionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BulkUploadPage
        userRole="Content Creator"
        apiEndpoint="/api/oup-creator/questions"
        userRoleParam="content_creator"
      />
    </Suspense>
  );
}
