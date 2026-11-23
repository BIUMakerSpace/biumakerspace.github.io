import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DirectionProvider } from "@radix-ui/react-direction";
import type { Workshop } from "@/lib/workshops";

const workshops: Workshop[] = [{
  id: "w1", title: "רובוט הולך", description: "", image_url: null, notice: null, is_published: false,
  sort_order: 0, created_at: "", updated_at: "",
  meetings: [{
    id: "m1", workshop_id: "w1", title: "מפגש 1", starts_at: "2027-12-06T16:00:00Z", capacity: 12,
    is_cancelled: false, materials: [], created_at: "", updated_at: "", registered_count: 2, is_registered: false,
  }],
}];
const idle = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
const { saveMeeting, toastError } = vi.hoisted(() => ({ saveMeeting: vi.fn(), toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

vi.mock("@/lib/storage", () => ({
  IMAGE_ACCEPT: "image/png", validateImage: () => null, uploadPublicImage: vi.fn(),
  removeFiles: vi.fn(), publicUrlToPath: () => null,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "admin" }, loading: false, isAdmin: true }) }));
vi.mock("@/lib/queries/workshops", () => ({
  useWorkshops: () => ({ data: workshops, isLoading: false }),
  useMeetingRegistrations: () => ({
    data: [{ id: "r1", created_at: "", user_id: "u1", profiles: { full_name: "דנה", email: "d@x.com", phone: "050" } }],
    isLoading: false,
  }),
  useSaveWorkshop: idle, useDeleteWorkshop: idle, useSaveMeeting: () => ({ mutate: saveMeeting, isPending: false }), useDeleteMeeting: idle, useRemoveRegistration: idle,
}));

const { default: WorkshopsManager } = await import("./WorkshopsManager");

describe("WorkshopsManager", () => {
  it("lists workshops with draft status, meetings in Israel time, and registrants on demand", () => {
    render(<DirectionProvider dir="rtl"><WorkshopsManager /></DirectionProvider>);
    expect(screen.getByRole("heading", { name: "סדנה חדשה" })).toBeInTheDocument();
    expect(screen.getAllByText("טיוטה").length).toBeGreaterThan(0);
    expect(screen.getByText(/יום שני 6\.12 · 18:00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /2\/12/ }));
    expect(screen.getByText("דנה")).toBeInTheDocument();
  });

  it("prefills a new meeting one week after the last one", () => {
    render(<DirectionProvider dir="rtl"><WorkshopsManager /></DirectionProvider>);
    fireEvent.click(screen.getByRole("button", { name: /הוספת מפגש/ }));
    expect(screen.getByDisplayValue("מפגש 2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2027-12-13T18:00")).toBeInTheDocument();
  });

  it("attaches materials to a meeting, cleaning Drive links and rejecting non-https ones", () => {
    render(<DirectionProvider dir="rtl"><WorkshopsManager /></DirectionProvider>);
    fireEvent.click(screen.getByRole("button", { name: "ערוך מפגש" }));
    fireEvent.click(screen.getByRole("button", { name: /הוספת קובץ/ }));
    fireEvent.change(screen.getByLabelText("שם הקובץ"), { target: { value: "מצגת מפגש 1" } });
    fireEvent.change(screen.getByLabelText("קישור"), { target: { value: "http://example.com/x" } });
    fireEvent.click(screen.getByRole("button", { name: "שמור" }));
    expect(toastError).toHaveBeenCalled();
    expect(saveMeeting).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("קישור"), {
      target: { value: "https://drive.google.com/file/d/1qZsZOpeNoVgyrBB7t3LMScd8ljsyjZ8n/view?usp=drivesdk" },
    });
    fireEvent.click(screen.getByRole("button", { name: "שמור" }));
    expect(saveMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "m1",
        values: expect.objectContaining({
          materials: [{ kind: "slides", title: "מצגת מפגש 1", url: "https://drive.google.com/file/d/1qZsZOpeNoVgyrBB7t3LMScd8ljsyjZ8n/view" }],
        }),
      }),
      expect.anything(),
    );
  });
});
