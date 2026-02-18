"use client";

import { Suspense } from "react";
import BulkUploadPage from "@/components/BulkUploadPage";

export default function TeacherBulkUploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BulkUploadPage
        userRole="Teacher"
        apiEndpoint="/api/teacher/questions"
        userRoleParam="teacher"
      />
    </Suspense>
  );
}
