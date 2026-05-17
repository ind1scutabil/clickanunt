/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import CountryOfOriginSelect from "@/app/components/listing/CountryOfOriginSelect";

describe("CountryOfOriginSelect", () => {
  it("renders with empty value", () => {
    render(<CountryOfOriginSelect value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders with known ISO value ES", () => {
    render(<CountryOfOriginSelect value="ES" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("ES");
  });

  it("coerces legacy free-text to empty select value (WebView-safe)", () => {
    render(<CountryOfOriginSelect value="Cehoslovacia" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("normalizes Romanian label Spania to ES", () => {
    render(<CountryOfOriginSelect value="Spania" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("ES");
  });
});
