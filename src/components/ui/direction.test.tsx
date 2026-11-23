import { render, screen } from "@testing-library/react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { describe, expect, it } from "vitest";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Radix components read the page direction from DirectionProvider. If npm installs two copies of
// @radix-ui/react-direction, they can't see the provider and silently render dir="ltr", which
// flips whole pages (this happened to the admin area). package.json "overrides" keeps one copy.
describe("RTL direction", () => {
  it("Radix Tabs inherit rtl from DirectionProvider", () => {
    render(
      <DirectionProvider dir="rtl">
        <Tabs defaultValue="a" data-testid="tabs">
          <TabsList>
            <TabsTrigger value="a">א</TabsTrigger>
          </TabsList>
        </Tabs>
      </DirectionProvider>,
    );
    expect(screen.getByTestId("tabs")).toHaveAttribute("dir", "rtl");
  });
});
