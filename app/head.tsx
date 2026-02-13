import { generateOrganizationStructuredData, generateLocalBusinessStructuredData } from "@/lib/seo";

export default function Head() {
  const structuredData = [
    generateOrganizationStructuredData(),
    generateLocalBusinessStructuredData(),
  ];

  return (
    <>
      {structuredData.map((data, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
