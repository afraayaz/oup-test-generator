"use client";

import QuestionCreationModePage from "@/components/QuestionCreationModePage";

export default function CreateQuestionPage() {
  return (
    <QuestionCreationModePage
      userRole="Content Creator"
      baseRoute="/content-creator/create"
      apiEndpoint="/api/oup-creator/questions"
    />
  );
}
