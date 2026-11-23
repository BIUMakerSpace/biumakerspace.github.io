import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Workshop } from "@/lib/workshops";

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const meeting = (id: string, over: Partial<Workshop["meetings"][number]> = {}) => ({
  id, workshop_id: "w1", title: `מפגש ${id}`, starts_at: future(7), capacity: 12, is_cancelled: false,
  created_at: "", updated_at: "", registered_count: 3, is_registered: false, ...over,
});
const workshops: Workshop[] = [{
  id: "w1", title: "רובוט הולך", description: "בונים רובוט", image_url: null, notice: "ב־7.12 אין מפגש",
  is_published: true, sort_order: 0, created_at: "", updated_at: "",
  meetings: [
    meeting("1"),
    meeting("2", { registered_count: 12 }),
    meeting("3", { is_registered: true }),
    meeting("4", { is_cancelled: true }),
    meeting("5", { starts_at: future(-1) }),
  ],
}, {
  id: "w2", title: "טיוטה", description: "", image_url: null, notice: null, is_published: false,
  sort_order: 1, created_at: "", updated_at: "", meetings: [],
}];

const mutate = vi.fn();
let user: { id: string } | null = { id: "u1" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user, loading: false, isAdmin: false }) }));
vi.mock("@/lib/queries/workshops", () => ({
  useWorkshops: () => ({ data: workshops, isLoading: false, isError: false, refetch: vi.fn() }),
  useToggleRegistration: () => ({ mutate, isPending: false, variables: undefined }),
}));

const { default: Workshops } = await import("./Workshops");
const renderPage = () => render(<MemoryRouter><Workshops /></MemoryRouter>);

describe("Workshops page", () => {
  beforeEach(() => { mutate.mockClear(); user = { id: "u1" }; });

  it("shows published workshops only, with the admin's notice", () => {
    renderPage();
    expect(screen.getByText("רובוט הולך")).toBeInTheDocument();
    expect(screen.queryByText("טיוטה")).not.toBeInTheDocument();
    expect(screen.getByText("ב־7.12 אין מפגש")).toBeInTheDocument();
  });

  it("labels each meeting by its state", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "הרשמה למפגש" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "המפגש מלא" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /ביטול הרשמה/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "המפגש בוטל" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "המפגש הסתיים" })).toBeDisabled();
    expect(screen.getAllByText("9 מקומות פנויים")).toHaveLength(2);
  });

  it("registers and cancels through the mutation", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "הרשמה למפגש" }));
    expect(mutate).toHaveBeenLastCalledWith({ meetingId: "1", register: true }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /ביטול הרשמה/ }));
    expect(mutate).toHaveBeenLastCalledWith({ meetingId: "3", register: false }, expect.anything());
  });

  it("filters to the student's own meetings", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "המפגשים שלי" }));
    expect(screen.getByText(/מפגש 3/)).toBeInTheDocument();
    expect(screen.queryByText(/מפגש 1/)).not.toBeInTheDocument();
  });

  it("asks signed-out visitors to sign in instead of registering", () => {
    user = null;
    renderPage();
    expect(screen.queryByRole("button", { name: "המפגשים שלי" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "התחברות והרשמה" }));
    expect(mutate).not.toHaveBeenCalled();
  });
});
