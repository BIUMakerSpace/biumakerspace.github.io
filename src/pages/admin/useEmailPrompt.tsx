import { useState } from "react";
import EmailDialog from "@/components/admin/EmailDialog";

interface EmailPrompt {
  templateKey: string;
  email: string;
  name: string;
  onConfirm: () => Promise<void> | void;
}

/**
 * Status changes that notify the requester go through an email dialog first:
 * the admin can edit and send the templated email, or apply the change silently.
 */
export function useEmailPrompt() {
  const [prompt, setPrompt] = useState<EmailPrompt | null>(null);
  const dialog = prompt && (
    <EmailDialog
      open
      onClose={() => setPrompt(null)}
      templateKey={prompt.templateKey}
      recipientEmail={prompt.email}
      recipientName={prompt.name}
      onDone={prompt.onConfirm}
    />
  );
  return { promptEmail: setPrompt, emailDialog: dialog };
}
