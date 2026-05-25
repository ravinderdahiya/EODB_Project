import { useMemo, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { submitFeedback } from "@/services/feedbackService";
import "./FeedbackWidget.css";

const WHATSAPP_NUMBER = `${import.meta.env.VITE_FEEDBACK_WHATSAPP_NUMBER || ""}`.replace(/[^\d]/g, "");
const shouldOpenWhatsAppChat = String(import.meta.env.VITE_FEEDBACK_OPEN_WHATSAPP_CHAT || "true").toLowerCase() === "true";

const buildWhatsAppUrl = (text) => {
  const encoded = encodeURIComponent(text);
  if (WHATSAPP_NUMBER) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
};

const getLoggedInUser = () => {
  try {
    const rawSessionUser = sessionStorage.getItem("user");
    if (rawSessionUser) {
      const parsed = JSON.parse(rawSessionUser);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // ignore parsing/storage errors
  }
  return {};
};

const buildFeedbackMessage = (form, mobileFromSession) => {
  const complaintId = `HSAC_${Date.now()}`;
  return [
    "New user feedback",
    `Comp-ID: ${complaintId}`,
    `Name: ${form.name.trim()}`,
    mobileFromSession ? `Mobile: ${mobileFromSession}` : "",
    `Message: ${form.message.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
};

export default function FeedbackWidget({
  hidden = false,
  open: controlledOpen,
  onOpenChange,
  showFab = true,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (nextOpen) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
      return;
    }
    setInternalOpen(nextOpen);
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const sessionUser = useMemo(() => getLoggedInUser(), []);
  const sessionMobile = `${sessionUser?.mobile || ""}`.trim();
  const [form, setForm] = useState({
    name: `${sessionUser?.fullname || ""}`.trim(),
    message: "",
  });

  const canSubmit = useMemo(
    () => form.name.trim().length > 1 && form.message.trim().length > 3 && !submitting,
    [form, submitting],
  );

  const resetForm = () => {
    setForm((prev) => ({ ...prev, message: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        mobile: sessionMobile || null,
        pageUrl: window.location.href,
      };
      const response = await submitFeedback(payload);
      const feedbackId = response?.feedbackId ? `FB-${response.feedbackId}` : "N/A";
      const message = buildFeedbackMessage(form, sessionMobile);

      if (shouldOpenWhatsAppChat) {
        window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
      }

      const cloudStatus = response?.whatsapp;
      if (cloudStatus?.sent) {
        setSuccess(`Feedback submitted and WhatsApp API sent. Reference ID: ${feedbackId}`);
      } else {
        setSuccess(`Feedback submitted. Reference ID: ${feedbackId}`);
      }
      resetForm();
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to submit feedback right now.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden) return null;

  return (
    <>
      {showFab ? (
        <button
          type="button"
          className="feedback-fab"
          onClick={() => setOpen(true)}
          aria-label="Open feedback form"
        >
          <MessageCircle size={20} />
          <span>Feedback</span>
        </button>
      ) : null}

      {open ? (
        <div className="feedback-modal-backdrop" onClick={() => setOpen(false)}>
          <section
            className="feedback-modal"
            onClick={(event) => event.stopPropagation()}
            aria-label="Feedback form"
          >
            <header className="feedback-modal__header">
              <h3>Share Feedback</h3>
              <button
                type="button"
                className="feedback-modal__close"
                onClick={() => setOpen(false)}
                aria-label="Close feedback form"
              >
                <X size={18} />
              </button>
            </header>

            <form className="feedback-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Enter your name"
                  required
                />
              </label>

              <label>
                Feedback
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, message: event.target.value }))
                  }
                  required
                />
              </label>

              {error ? <p className="feedback-form__error">{error}</p> : null}
              {success ? <p className="feedback-form__success">{success}</p> : null}

              <button type="submit" className="feedback-form__submit" disabled={!canSubmit}>
                <Send size={16} />
                <span>{submitting ? "Submitting..." : "Submit Feedback"}</span>
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
