import React from "react";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `https://kreator.com.br${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationJsonLd({
  name = "Kreator",
  url = "https://kreator.com.br",
  logo = "https://kreator.com.br/logo.png",
  description = "Plataforma completa de agendamentos online, orçamentos e gestão para prestadores de serviços e empresas.",
}: {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    description,
    sameAs: [
      "https://instagram.com/kreatorapp",
      "https://facebook.com/kreatorapp",
      "https://linkedin.com/company/kreatorapp",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+55-41-99999-9999",
      contactType: "customer service",
      availableLanguage: ["Portuguese", "English", "Spanish"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function SoftwareAppJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kreator — Sistema de Agendamentos e Orçamentos",
    operatingSystem: "Web, iOS, Android",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "BRL",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1280",
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FaqJsonLd({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LocalBusinessJsonLd({
  name,
  description,
  url,
  logo,
  telephone,
  address,
  priceRange = "$$",
  ratingValue,
  reviewCount,
  businessType = "LocalBusiness",
}: {
  name: string;
  description?: string;
  url: string;
  logo?: string | null;
  telephone?: string | null;
  address?: string | null;
  priceRange?: string;
  ratingValue?: number | null;
  reviewCount?: number;
  businessType?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": businessType || "LocalBusiness",
    name,
    description: description || `Agendamentos e serviços online para ${name}`,
    url,
    priceRange,
  };

  if (logo) schema.image = logo;
  if (telephone) schema.telephone = telephone;
  if (address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: address,
      addressCountry: "BR",
    };
  }

  if (ratingValue && reviewCount && reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toFixed(1),
      reviewCount: reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
