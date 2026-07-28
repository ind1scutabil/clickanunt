/** @jest-environment node */
import { buildListingSpecRows } from "@/lib/listing-category-specs";

describe("auto listing spec rows — RO labels, no EN duplicates", () => {
  const peugeotLike = {
    category: "Auto, moto și ambarcațiuni",
    condition: "Utilizat",
    make: "Peugeot",
    model: "508",
    year: 2017,
    mileage: 155096,
    fuel: "diesel",
    transmission: "automatic",
    county: "Gorj",
    city: "Târgu Jiu",
    attributes: {
      keys: 2,
      rare: false,
      color: "Gri",
      owners: 1,
      bodyType: "sedan",
      accidents: "no",
      cocPapers: false,
      condition: "Utilizat",
      doorCount: 4,
      seatCount: 5,
      horsepower: 120,
      upholstery: "Piele",
      co2Emissions: null,
      countryOfOrigin: "FR",
      cylinderCapacity: 1590,
      registrationDate: "2017-07-11",
      inspectionExpires: null,
      environmentalClass: "EURO6",
      lastRegistrationCountry: "FR",
    },
  };

  it("dedupes Stare/Condition and maps English attribute keys to Romanian", () => {
    const rows = buildListingSpecRows(peugeotLike);
    const labels = rows.map((r) => r.label);

    expect(labels.filter((l) => l === "Stare")).toHaveLength(1);
    expect(labels).not.toContain("Condition");
    expect(labels).not.toContain("Horsepower");
    expect(labels).not.toContain("Cylinder Capacity");
    expect(labels).not.toContain("Registration Date");
    expect(labels).not.toContain("Accidents");
    expect(labels).not.toContain("Keys");
    expect(labels).not.toContain("Color");
    expect(labels).not.toContain("Owners");
    expect(labels).not.toContain("Body Type");
    expect(labels).not.toContain("Upholstery");
    expect(labels).not.toContain("Country Of Origin");

    expect(labels).toContain("Chei");
    expect(labels).toContain("Culoare");
    expect(labels).toContain("Număr proprietari");
    expect(labels).toContain("Caroserie");
    expect(labels).toContain("Tapițerie");
    expect(labels).toContain("Țara de proveniență");
    expect(labels).toContain("Putere");
    expect(labels).toContain("Capacitate cilindrică");
    expect(labels).toContain("Prima înmatriculare");
    expect(labels).toContain("Accidente");

    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]));
    expect(byLabel["Caroserie"]).toBe("Berlina");
    expect(byLabel["Putere"]).toBe("120");
    expect(byLabel["Capacitate cilindrică"]).toBe("1.590");
    expect(byLabel["Accidente"]).toBe("Nu");
    expect(byLabel["Chei"]).toBe("2");
  });
});
