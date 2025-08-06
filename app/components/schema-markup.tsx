interface SchemaMarkupProps {
  type: 'website' | 'article' | 'product' | 'organization' | 'breadcrumb';
  data: any;
}

export function SchemaMarkup({ type, data }: SchemaMarkupProps) {
  const generateSchema = () => {
    const baseUrl = 'https://replyguy.appendment.com';
    
    switch (type) {
      case 'website':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ReplyGuy',
          description: 'AI-powered Twitter reply generator that helps you craft authentic, engaging replies in seconds. Build your personal brand and grow your audience with human-like AI responses.',
          url: baseUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/search?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          },
          publisher: {
            '@type': 'Organization',
            name: 'ReplyGuy',
            url: baseUrl,
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/logo.png`,
              width: 600,
              height: 60
            }
          }
        };

      case 'organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'ReplyGuy',
          description: 'AI-powered Twitter reply generator for authentic social media engagement',
          url: baseUrl,
          applicationCategory: 'Social Media Tools',
          operatingSystem: 'Web Browser',
          offers: {
            '@type': 'Offer',
            price: '19',
            priceCurrency: 'USD',
            priceValidUntil: '2024-12-31',
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/pricing`
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150'
          },
          author: {
            '@type': 'Organization',
            name: 'ReplyGuy',
            url: baseUrl
          }
        };

      case 'article':
        return {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          description: data.description,
          image: data.image || `${baseUrl}/og-image.png`,
          datePublished: data.publishedTime || '2024-01-15T10:00:00Z',
          dateModified: data.modifiedTime || '2024-01-15T10:00:00Z',
          author: {
            '@type': 'Organization',
            name: 'ReplyGuy',
            url: baseUrl
          },
          publisher: {
            '@type': 'Organization',
            name: 'ReplyGuy',
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/logo.png`,
              width: 600,
              height: 60
            }
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': data.url
          },
          keywords: data.keywords || ['Twitter replies', 'AI writing', 'social media engagement'],
          articleSection: 'Social Media Marketing',
          wordCount: data.wordCount || 2500
        };

      case 'product':
        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.name || 'ReplyGuy AI Reply Generator',
          description: data.description || 'AI-powered tool for generating authentic Twitter replies',
          image: data.image || `${baseUrl}/og-image.png`,
          brand: {
            '@type': 'Brand',
            name: 'ReplyGuy'
          },
          offers: {
            '@type': 'Offer',
            price: data.price || '19',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/pricing`,
            priceValidUntil: '2024-12-31'
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150'
          },
          category: 'Social Media Software'
        };

      case 'breadcrumb':
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: data.items.map((item: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
          }))
        };

      default:
        return null;
    }
  };

  const schema = generateSchema();
  
  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 2)
      }}
    />
  );
}