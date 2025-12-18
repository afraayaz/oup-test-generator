"use client";

import BulkUploadPage from "@/components/BulkUploadPage";

export default function TeacherBulkUploadPage() {
  return (
    <BulkUploadPage
      userRole="Teacher"
      apiEndpoint="/api/teacher/questions"
      userRoleParam="teacher"
    />
  );
}
