"use client";

import QuestionCreationModePage from "@/components/QuestionCreationModePage";

export default function TeacherCreateQuestionPage() {
  return (
    <QuestionCreationModePage
      userRole="Teacher"
      baseRoute="/teacher/create-questions"
      apiEndpoint="/api/teacher/questions"
    />
  );
}
