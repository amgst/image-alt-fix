import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import * as shopify from "./shopify";
import type { ShopifyProduct, StoreAuditSummary, ShopifyProductImage } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const SHOPIFY_SCOPES =
  process.env.SCOPES || "read_products,write_products,read_files,write_files";
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL || `http://localhost:${PORT}`;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Allow Shopify admin to load this app in an iframe (required for an
// embedded app — without this the browser refuses to render us inside
// admin.shopify.com at all).
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com;"
  );
  next();
});

// Resolves the requesting shop (App Bridge ID token, falling back to the
// cookie session) into res.locals.shop before any /api/* route runs.
app.use("/api", async (req, res, next) => {
  res.locals.shop = await resolveShopForRequest(req);
  next();
});

// Initial realistic Shopify catalog state
let products: ShopifyProduct[] = [
  {
    id: "prod_1",
    title: "Apex Horizon 3-Layer All-Weather Shell",
    handle: "apex-horizon-3-layer-all-weather-shell",
    vendor: "Aura Expedition",
    productType: "Outerwear",
    status: "active",
    description:
      "Engineered for mountaineering and stormy ascents. Features a breathable 20,000mm waterproof membrane, taped seams, YKK Aquaguard zippers, and storm hood.",
    priceRange: { min: "349.00", max: "349.00" },
    overallSeoScore: 68,
    overallGeoScore: 61,
    lastAuditedAt: "2026-09-20T14:30:00Z",
    tags: ["outerwear", "waterproof", "mountaineering", "technical-jacket"],
    images: [
      {
        id: "img_101",
        url: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1200&auto=format&fit=crop",
        altText: "jacket",
        filename: "IMG_20260401_RAW.jpg",
        width: 1800,
        height: 1800,
        format: "JPEG",
        fileSizeKb: 1420,
        variantIds: ["var_101"],
        isHero: true,
        seoScore: 54,
        geoScore: 48,
        inShopifyFiles: true,
        createdAt: "2026-09-15T10:00:00Z",
        issues: [
          {
            id: "iss_1",
            type: "alt_weak",
            severity: "critical",
            title: "Overly generic alt text ('jacket')",
            description: "Search engines and AI answer engines cannot identify material, brand, color, or technical features from single-word alt text.",
            suggestedFix: "Apex Horizon 3-layer waterproof alpine shell jacket in Slate Grey front view with storm hood",
          },
          {
            id: "iss_2",
            type: "filename_generic",
            severity: "warning",
            title: "Camera-default filename ('IMG_20260401_RAW.jpg')",
            description: "Descriptive filenames provide critical keyword signals for Google Images and GEO entity linking.",
            suggestedFix: "apex-horizon-waterproof-shell-jacket-slate-grey-front.jpg",
          },
          {
            id: "iss_3",
            type: "no_translations",
            severity: "info",
            title: "Missing multi-language alt text",
            description: "Your store sells internationally, but localized alt text is missing for ES, FR, DE, JA markets.",
            suggestedFix: "Generate translated alt texts for target markets.",
          },
        ],
        proposedAltText: "Apex Horizon 3-layer waterproof mountaineering shell jacket in Slate Grey front studio shot with storm hood and taped seams",
        proposedFilename: "apex-horizon-waterproof-shell-jacket-slate-grey-front.jpg",
        translations: {
          en: "Apex Horizon 3-layer waterproof mountaineering shell jacket in Slate Grey front studio shot with storm hood and taped seams",
          es: "Chaqueta impermeable de montaña Apex Horizon de 3 capas en gris pizarra con capucha para tormentas",
          fr: "Veste de montagne imperméable 3 couches Apex Horizon en gris ardoise avec capuche tempête",
          de: "Wasserdichte 3-Lagen-Bergsteigerjacke Apex Horizon in Schiefergrau mit Sturmkapuze",
          ja: "アペックス・ホライゾン 3レイヤー 防水マウンテニアリング シェルジャケット（スレートグレー、ストームフード付き）",
        },
      },
      {
        id: "img_102",
        url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop",
        altText: "Apex Horizon jacket side angle",
        filename: "apex-side-view.jpg",
        width: 1600,
        height: 1600,
        format: "JPEG",
        fileSizeKb: 980,
        variantIds: [],
        isHero: false,
        seoScore: 72,
        geoScore: 68,
        inShopifyFiles: true,
        createdAt: "2026-09-15T10:05:00Z",
        issues: [
          {
            id: "iss_4",
            type: "variant_unassigned",
            severity: "critical",
            title: "Unassigned to color/size variant",
            description: "Customers selecting Black Obsidian variant see no dedicated image switch, increasing bounce rate.",
            suggestedFix: "Assign this image to variant 'Black Obsidian / M' and 'Black Obsidian / L'.",
          },
        ],
        proposedAltText: "Apex Horizon 3-layer technical shell side profile showing articulated sleeves and waterproof pit ventilation zips in Black Obsidian",
        proposedFilename: "apex-horizon-shell-jacket-black-obsidian-side-profile.jpg",
        translations: {
          en: "Apex Horizon 3-layer technical shell side profile showing articulated sleeves and waterproof pit ventilation zips in Black Obsidian",
          es: "Perfil lateral de la chaqueta técnica Apex Horizon en Black Obsidian mostrando mangas articuladas",
          fr: "Profil latéral de la veste technique Apex Horizon en Black Obsidian avec manches articulées",
          de: "Seitenprofil der technischen Apex Horizon Jacke in Black Obsidian mit bewegungsfreundlichen Ärmeln",
          ja: "アペックス・ホライゾン テクニカルシェル サイドビュー（ブラック・オブシディアン、ベンチレーションジップ付き）",
        },
      },
      {
        id: "img_103",
        url: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1200&auto=format&fit=crop",
        altText: "",
        filename: "dsc09212_edit_final.png",
        width: 1400,
        height: 1400,
        format: "PNG",
        fileSizeKb: 2890,
        variantIds: [],
        isHero: false,
        seoScore: 42,
        geoScore: 35,
        inShopifyFiles: false,
        createdAt: "2026-09-16T11:20:00Z",
        issues: [
          {
            id: "iss_5",
            type: "alt_missing",
            severity: "critical",
            title: "Empty alt text (missing attribute)",
            description: "Images with missing alt text fail Web Content Accessibility Guidelines and are penalized in image rankings.",
            suggestedFix: "Close-up detail of Apex Horizon jacket YKK AquaGuard zipper and micro-fleece chin guard",
          },
          {
            id: "iss_6",
            type: "filename_generic",
            severity: "warning",
            title: "Non-descriptive camera filename ('dsc09212_edit_final.png')",
            description: "Rename with product model, component, and technical feature.",
            suggestedFix: "apex-horizon-jacket-waterproof-zipper-detail.png",
          },
        ],
        proposedAltText: "Close-up macro detail of Apex Horizon waterproof jacket featuring matte YKK AquaGuard storm zipper and welded chest pocket seam",
        proposedFilename: "apex-horizon-shell-jacket-zipper-seam-macro-detail.jpg",
        translations: {
          en: "Close-up macro detail of Apex Horizon waterproof jacket featuring matte YKK AquaGuard storm zipper and welded chest pocket seam",
          es: "Detalle macro en primer plano de la cremallera impermeable YKK AquaGuard en la chaqueta Apex Horizon",
          fr: "Gros plan sur la fermeture à glissière étanche YKK AquaGuard et la couture thermosoudée de la veste Apex Horizon",
          de: "Detailaufnahme des wasserdichten YKK AquaGuard Reißverschlusses der Apex Horizon Jacke",
          ja: "アペックス・ホライゾン 防水ジャケット YKKアクアガード止水ジッパーとシームテープの詳細クローズアップ",
        },
      },
      {
        id: "img_104",
        url: "https://images.unsplash.com/photo-1548883354-7622d03aca27?q=80&w=800&auto=format&fit=crop",
        altText: "Fabric swatch and seam texture",
        filename: "swatch_thumb_720.jpg",
        width: 720,
        height: 720,
        format: "JPEG",
        fileSizeKb: 185,
        variantIds: [],
        isHero: false,
        seoScore: 46,
        geoScore: 42,
        inShopifyFiles: false,
        createdAt: "2026-09-17T14:10:00Z",
        issues: [
          {
            id: "iss_7",
            type: "low_res",
            severity: "critical",
            title: "Low resolution (720×720 px)",
            description: "Image is below Shopify recommended minimum zoom resolution of 1024×1024 px. Detail hover-zoom is disabled on storefront product pages.",
            suggestedFix: "Upscale to 1440×1440 px HD resolution or re-upload 2048px master asset.",
          },
        ],
        proposedAltText: "Apex Horizon waterproof micro-ripstop nylon weave texture and triple-welded seam swatch detail in Slate Grey",
        proposedFilename: "apex-horizon-waterproof-ripstop-fabric-seam-swatch.jpg",
        translations: {
          en: "Apex Horizon waterproof micro-ripstop nylon weave texture and triple-welded seam swatch detail in Slate Grey",
          es: "Detalle del tejido de nailon micro-ripstop impermeable y costura termosellada Apex Horizon",
          fr: "Échantillon de tissu en nylon micro-ripstop imperméable et couture thermosoudée Apex Horizon",
          de: "Stoffmuster aus wasserdichtem Micro-Ripstop-Nylon und versiegelten Nähten der Apex Horizon Jacke",
          ja: "アペックス・ホライゾン 防水マイクロリップストップナイロン生地と溶着シームのスウォッチ詳細",
        },
      },
      {
        id: "img_105",
        url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop",
        altText: "Outdoor mountaineering lifestyle shot",
        filename: "apex-mountain-lifestyle-banner.jpg",
        width: 1600,
        height: 900,
        format: "JPEG",
        fileSizeKb: 840,
        variantIds: [],
        isHero: false,
        seoScore: 62,
        geoScore: 58,
        inShopifyFiles: true,
        createdAt: "2026-09-18T16:00:00Z",
        issues: [
          {
            id: "iss_8",
            type: "aspect_ratio_mismatch",
            severity: "warning",
            title: "Aspect ratio mismatch (16:9 widescreen)",
            description: "Storefront catalog grid requires standard 1:1 square media. 16:9 ratio causes uneven card heights and white letterboxing.",
            suggestedFix: "Re-crop to 1:1 square or re-frame with Image Studio generative fill.",
          },
        ],
        proposedAltText: "Mountaineer wearing Apex Horizon 3-layer waterproof shell jacket on misty alpine summit ridge",
        proposedFilename: "apex-horizon-waterproof-shell-mountaineer-summit-lifestyle.jpg",
        translations: {
          en: "Mountaineer wearing Apex Horizon 3-layer waterproof shell jacket on misty alpine summit ridge",
          es: "Montañero vistiendo la chaqueta impermeable Apex Horizon en la cresta de una cumbre alpina",
          fr: "Alpiniste portant la veste technique Apex Horizon sur une crête alpine brumeuse",
          de: "Bergsteiger mit der wasserdichten Apex Horizon Jacke auf einem nebligen alpinen Berggipfel",
          ja: "霧のアルプス山頂の尾根でアペックス・ホライゾン 防水シェルジャケットを着用した登山者",
        },
      },
    ],
    variants: [
      {
        id: "var_101",
        title: "Slate Grey / M",
        sku: "APX-SLT-M",
        price: "349.00",
        options: { Color: "Slate Grey", Size: "M" },
        imageId: "img_101",
      },
      {
        id: "var_102",
        title: "Slate Grey / L",
        sku: "APX-SLT-L",
        price: "349.00",
        options: { Color: "Slate Grey", Size: "L" },
        imageId: "img_101",
      },
      {
        id: "var_103",
        title: "Black Obsidian / M",
        sku: "APX-BLK-M",
        price: "349.00",
        options: { Color: "Black Obsidian", Size: "M" },
        imageId: undefined, // VARIANT GAP!
      },
      {
        id: "var_104",
        title: "Black Obsidian / L",
        sku: "APX-BLK-L",
        price: "349.00",
        options: { Color: "Black Obsidian", Size: "L" },
        imageId: undefined, // VARIANT GAP!
      },
      {
        id: "var_105",
        title: "Alpine Moss / M",
        sku: "APX-MSS-M",
        price: "349.00",
        options: { Color: "Alpine Moss", Size: "M" },
        imageId: undefined, // VARIANT GAP!
      },
    ],
    jsonLd: {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: "Apex Horizon 3-Layer All-Weather Shell",
      description: "Engineered for mountaineering and stormy ascents. Features a breathable 20,000mm waterproof membrane.",
      sku: "APX-SLT-M",
      mpn: "APX-HZ-2026",
      brand: {
        "@type": "Brand",
        name: "Aura Expedition",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "349.00",
        availability: "https://schema.org/InStock",
        url: "https://aura-store.myshopify.com/products/apex-horizon-3-layer-all-weather-shell",
      },
      image: [
        {
          "@type": "ImageObject",
          contentUrl: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1200&auto=format&fit=crop",
          caption: "jacket",
          encodingFormat: "image/jpeg",
          width: 1800,
          height: 1800,
          name: "Apex Horizon Shell Front",
        },
      ],
    },
    studioGenerations: [
      {
        id: "gen_apex_hero",
        url: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1800&auto=format&fit=crop",
        prompt: "Iconic 4K studio hero shot of Apex Horizon shell jacket, softbox commercial reflections on slate podium, crisp waterproof seam texture",
        mode: "hero",
        aspectRatio: "1:1",
        width: 2048,
        height: 2048,
        seoScore: 98,
        geoScore: 95,
        resolutionLabel: "4K Ultra-HD (2048×2048)",
        suggestedAltText: "Apex Horizon 3-layer technical shell jacket in Slate Grey on charcoal granite podium under calibrated studio lighting",
        suggestedFilename: "apex-horizon-3-layer-waterproof-shell-slate-grey-hero-studio.jpg",
        timestamp: "2026-09-20T16:00:00Z",
        qualityImprovements: [
          "+52 SEO & GEO score improvement over raw upload",
          "2048×2048 Ultra-HD zoom resolution (Shopify Zoom Certified)",
          "Calibrated softbox lighting & realistic directional floor shadow",
          "Perfect 1:1 catalog aspect ratio alignment",
          "Zero compression artifacts with crisp edge masking"
        ],
      },
      {
        id: "gen_apex_variant",
        url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1800&auto=format&fit=crop",
        prompt: "Consistent variant colorway photography for Apex Horizon in Black Obsidian, preserving precise angles and hardware detail",
        mode: "variant",
        aspectRatio: "1:1",
        width: 1800,
        height: 1800,
        seoScore: 94,
        geoScore: 91,
        resolutionLabel: "Retina HD (1800×1800)",
        suggestedAltText: "Apex Horizon technical shell jacket in Black Obsidian variant view showing matte fabric and waterproof zips",
        suggestedFilename: "apex-horizon-waterproof-shell-black-obsidian-variant.jpg",
        timestamp: "2026-09-20T17:30:00Z",
        sourceVariantId: "var_103",
        qualityImprovements: [
          "Fills unassigned variant image gap on Shopify storefront",
          "Color-accurate spectral rendering with matte sheen",
          "Retina 1800×1800 px customer hover-zoom enabled",
          "Eliminates storefront customer return rates from color ambiguity"
        ],
      },
      {
        id: "gen_apex_lifestyle",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1800&auto=format&fit=crop",
        prompt: "In-situ contextual atmospheric mountaineering lifestyle scene of Apex Horizon during stormy mountain ascent",
        mode: "lifestyle",
        aspectRatio: "1:1",
        width: 1800,
        height: 1800,
        seoScore: 92,
        geoScore: 90,
        resolutionLabel: "Retina HD (1800×1800)",
        suggestedAltText: "Mountaineer wearing Apex Horizon waterproof shell jacket in misty high-altitude conditions",
        suggestedFilename: "apex-horizon-waterproof-shell-alpine-expedition-lifestyle.jpg",
        timestamp: "2026-09-20T18:15:00Z",
        qualityImprovements: [
          "High situational grounding for Google AI Overviews & Perplexity",
          "Emotional visual storytelling without on-location studio costs",
          "Natural ambient lighting and realistic depth of field"
        ],
      },
    ],
  },
  {
    id: "prod_2",
    title: "Solstice Minimalist Ceramic Automatic Watch",
    handle: "solstice-minimalist-ceramic-automatic-watch",
    vendor: "Chronos Atelier",
    productType: "Watches",
    status: "active",
    description: "Swiss mechanical automatic movement encased in scratch-resistant matte ceramic with sapphire crystal and quick-release Milanese mesh strap.",
    priceRange: { min: "580.00", max: "640.00" },
    overallSeoScore: 84,
    overallGeoScore: 78,
    lastAuditedAt: "2026-09-19T09:15:00Z",
    tags: ["watches", "luxury", "ceramic", "automatic-watch"],
    images: [
      {
        id: "img_201",
        url: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1200&auto=format&fit=crop",
        altText: "Solstice ceramic watch front face",
        filename: "solstice-ceramic-white-dial.jpg",
        width: 1800,
        height: 1800,
        format: "JPEG",
        fileSizeKb: 1100,
        variantIds: ["var_201"],
        isHero: true,
        seoScore: 82,
        geoScore: 80,
        inShopifyFiles: true,
        createdAt: "2026-09-14T08:00:00Z",
        issues: [
          {
            id: "iss_201",
            type: "alt_weak",
            severity: "warning",
            title: "Lacks semantic detail for AI answer engines",
            description: "Mentioning Swiss automatic movement, case diameter (39mm), and sapphire glass boosts Generative Engine Optimization.",
            suggestedFix: "Solstice 39mm matte ceramic automatic watch with white dial, exhibition caseback and sapphire crystal",
          },
        ],
        proposedAltText: "Solstice 39mm matte white ceramic automatic watch featuring minimalist dial indices, blued second hand, and anti-reflective sapphire crystal",
        proposedFilename: "solstice-39mm-ceramic-automatic-watch-white-dial.jpg",
        translations: {
          en: "Solstice 39mm matte white ceramic automatic watch featuring minimalist dial indices, blued second hand, and anti-reflective sapphire crystal",
          es: "Reloj automático de cerámica blanca mate Solstice de 39 mm con esfera minimalista y cristal de zafiro",
          fr: "Montre automatique en céramique blanche mate Solstice 39mm avec cadran épuré et verre saphir",
          de: "Solstice 39mm Automatikuhr aus mattweißer Keramik mit minimalistischem Zifferblatt und Saphirglas",
          ja: "ソルスティス 39mm マットホワイト セラミック オートマティック ウォッチ（サファイアクリスタル風防）",
        },
      },
      {
        id: "img_202",
        url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop",
        altText: "watch on wrist lifestyle shot",
        filename: "lifestyle-photo-1.jpg",
        width: 1920,
        height: 1080,
        format: "JPEG",
        fileSizeKb: 1350,
        variantIds: [],
        isHero: false,
        seoScore: 65,
        geoScore: 60,
        inShopifyFiles: true,
        createdAt: "2026-09-14T08:15:00Z",
        issues: [
          {
            id: "iss_202",
            type: "filename_generic",
            severity: "warning",
            title: "Generic filename ('lifestyle-photo-1.jpg')",
            description: "Should describe context: wrist wear, architectural office environment.",
            suggestedFix: "solstice-ceramic-automatic-watch-on-wrist-lifestyle.jpg",
          },
          {
            id: "iss_203",
            type: "aspect_ratio_mismatch",
            severity: "warning",
            title: "Aspect ratio mismatch (16:9 widescreen)",
            description: "Product catalog requires 1:1 square media. 16:9 ratio causes uneven card height.",
            suggestedFix: "Re-crop to 1:1 square (1080×1080 px).",
          },
        ],
        proposedAltText: "Lifestyle shot of Solstice ceramic watch worn on wrist with tailored charcoal suit cuff in modern architectural setting",
        proposedFilename: "solstice-ceramic-automatic-watch-on-wrist-lifestyle.jpg",
        translations: {
          en: "Lifestyle shot of Solstice ceramic watch worn on wrist with tailored charcoal suit cuff in modern architectural setting",
          es: "Foto de estilo de vida del reloj de cerámica Solstice en la muñeca con puño de traje gris marengo",
          fr: "Photo lifestyle de la montre en céramique Solstice portée au poignet avec un costume contemporain",
          de: "Lifestyle-Aufnahme der Solstice Keramikuhr am Handgelenk in moderner Architekturumgebung",
          ja: "ソルスティス セラミック ウォッチの手元着用ライフスタイル写真（スーツスタイル）",
        },
      },
    ],
    variants: [
      {
        id: "var_201",
        title: "Pure White Ceramic / Milanese Mesh",
        sku: "SLS-CRM-WHT",
        price: "580.00",
        options: { Color: "Pure White", Strap: "Milanese Mesh" },
        imageId: "img_201",
      },
      {
        id: "var_202",
        title: "Stealth Black Ceramic / Matte Link",
        sku: "SLS-CRM-BLK",
        price: "640.00",
        options: { Color: "Stealth Black", Strap: "Matte Link" },
        imageId: undefined, // VARIANT GAP!
      },
    ],
    jsonLd: {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: "Solstice Minimalist Ceramic Automatic Watch",
      description: "Swiss mechanical automatic movement encased in scratch-resistant matte ceramic with sapphire crystal.",
      sku: "SLS-CRM-WHT",
      mpn: "SLS-AT-39",
      brand: {
        "@type": "Brand",
        name: "Chronos Atelier",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "580.00",
        availability: "https://schema.org/InStock",
        url: "https://aura-store.myshopify.com/products/solstice-minimalist-ceramic-automatic-watch",
      },
      image: [
        {
          "@type": "ImageObject",
          contentUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1200&auto=format&fit=crop",
          caption: "Solstice ceramic watch front face",
          encodingFormat: "image/jpeg",
          width: 1800,
          height: 1800,
          name: "Solstice Ceramic Watch Front",
        },
      ],
    },
  },
  {
    id: "prod_3",
    title: "Lumina Ergonomic Architecture Desk Lamp",
    handle: "lumina-ergonomic-architecture-desk-lamp",
    vendor: "Lumina Works",
    productType: "Home & Office",
    status: "active",
    description: "Counterbalanced aluminum task light with circadian rhythm smart dimming, 98+ CRI natural spectrum LED, and wireless charging base.",
    priceRange: { min: "220.00", max: "260.00" },
    overallSeoScore: 56,
    overallGeoScore: 50,
    lastAuditedAt: "2026-09-18T16:45:00Z",
    tags: ["desk-lamp", "lighting", "ergonomic", "home-office"],
    images: [
      {
        id: "img_301",
        url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1200&auto=format&fit=crop",
        altText: "lamp",
        filename: "lamp-final.jpg",
        width: 1200,
        height: 1200,
        format: "JPEG",
        fileSizeKb: 720,
        variantIds: ["var_301"],
        isHero: true,
        seoScore: 52,
        geoScore: 46,
        inShopifyFiles: true,
        createdAt: "2026-09-10T12:00:00Z",
        issues: [
          {
            id: "iss_301",
            type: "alt_weak",
            severity: "critical",
            title: "Weak alt text ('lamp')",
            description: "Fails to include CRI 98+, dual-arm articulation, or anodized finish.",
            suggestedFix: "Lumina architectural LED task lamp in brushed space grey with counterbalanced arm",
          },
        ],
        proposedAltText: "Lumina adjustable architectural LED desk lamp in brushed space grey aluminum on minimalist oak work desk",
        proposedFilename: "lumina-architectural-led-desk-lamp-space-grey-desk-setup.jpg",
        translations: {
          en: "Lumina adjustable architectural LED desk lamp in brushed space grey aluminum on minimalist oak work desk",
          es: "Lámpara de escritorio LED arquitectónica ajustable Lumina en aluminio gris espacial cepillado",
          fr: "Lampe de bureau architecturale articulée à LED Lumina en aluminium gris sidéral brossé",
          de: "Verstellbare Lumina Architektur-Schreibtischlampe aus gebürstetem Aluminium in Space Grau",
          ja: "ルミナ アーキテクチュラル LED デスクランプ（スペースグレー アルミニウム製）",
        },
      },
    ],
    variants: [
      {
        id: "var_301",
        title: "Space Grey / Qi Base",
        sku: "LUM-DSK-GRY",
        price: "220.00",
        options: { Finish: "Space Grey", Base: "Qi Wireless Charging" },
        imageId: "img_301",
      },
      {
        id: "var_302",
        title: "Matte Brass / Qi Base",
        sku: "LUM-DSK-BRS",
        price: "260.00",
        options: { Finish: "Matte Brass", Base: "Qi Wireless Charging" },
        imageId: undefined, // VARIANT GAP!
      },
      {
        id: "var_303",
        title: "Anodized Silver / Standard Base",
        sku: "LUM-DSK-SLV",
        price: "200.00",
        options: { Finish: "Anodized Silver", Base: "Standard Clamp" },
        imageId: undefined, // VARIANT GAP!
      },
    ],
    jsonLd: {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: "Lumina Ergonomic Architecture Desk Lamp",
      description: "Counterbalanced aluminum task light with circadian rhythm smart dimming, 98+ CRI natural spectrum LED.",
      sku: "LUM-DSK-GRY",
      mpn: "LUM-ARC-98",
      brand: {
        "@type": "Brand",
        name: "Lumina Works",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "220.00",
        availability: "https://schema.org/InStock",
        url: "https://aura-store.myshopify.com/products/lumina-ergonomic-architecture-desk-lamp",
      },
      image: [
        {
          "@type": "ImageObject",
          contentUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1200&auto=format&fit=crop",
          caption: "lamp",
          encodingFormat: "image/jpeg",
          width: 1200,
          height: 1200,
          name: "Lumina Desk Lamp",
        },
      ],
    },
  },
  {
    id: "prod_4",
    title: "Aura Botanical Barrier Restorative Serum",
    handle: "aura-botanical-barrier-restorative-serum",
    vendor: "Aura Organics",
    productType: "Skincare",
    status: "active",
    description: "Concentrated lipid-replenishing facial elixir with squalane, blue tansy, and ceramide NP to restore the skin barrier.",
    priceRange: { min: "74.00", max: "74.00" },
    overallSeoScore: 76,
    overallGeoScore: 71,
    lastAuditedAt: "2026-09-20T11:00:00Z",
    tags: ["skincare", "serum", "clean-beauty", "ceramides"],
    images: [
      {
        id: "img_401",
        url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1200&auto=format&fit=crop",
        altText: "Aura serum bottle with dropper",
        filename: "serum_glass_bottle_v2.png",
        width: 1500,
        height: 1500,
        format: "PNG",
        fileSizeKb: 1980,
        variantIds: ["var_401"],
        isHero: true,
        seoScore: 76,
        geoScore: 71,
        inShopifyFiles: true,
        createdAt: "2026-09-17T09:30:00Z",
        issues: [
          {
            id: "iss_401",
            type: "filename_generic",
            severity: "warning",
            title: "Versioned filename ('serum_glass_bottle_v2.png')",
            description: "Remove version tags and add active ingredients for AI search engine indexing.",
            suggestedFix: "aura-botanical-barrier-restorative-serum-ceramide-blue-tansy-30ml.png",
          },
        ],
        proposedAltText: "Aura Botanical Barrier Restorative Serum 30ml amber glass bottle with pipette dropper displaying rich blue tansy oil texture on travertine pedestal",
        proposedFilename: "aura-botanical-barrier-restorative-serum-ceramide-blue-tansy-30ml.png",
        translations: {
          en: "Aura Botanical Barrier Restorative Serum 30ml amber glass bottle with pipette dropper displaying rich blue tansy oil texture on travertine pedestal",
          es: "Suero restaurador de barrera botánica Aura de 30 ml en frasco de vidrio ámbar con cuentagotas sobre pedestal de travertino",
          fr: "Sérum réparateur de barrière cutanée Aura Botanicals 30ml en flacon compte-gouttes ambré sur socle en travertin",
          de: "Aura Botanical regenerierendes Barriere-Serum 30ml in Braunglasflasche mit Pipette auf Travertinsockel",
          ja: "オーラ ボタニカル バリア リストラティブ セラム（30ml アンバー遮光瓶、ブルーの美容液オイルテクスチャー）",
        },
      },
    ],
    variants: [
      {
        id: "var_401",
        title: "30ml / Dropper Bottle",
        sku: "AUR-SRM-30",
        price: "74.00",
        options: { Size: "30ml", Packaging: "Dropper Bottle" },
        imageId: "img_401",
      },
      {
        id: "var_402",
        title: "50ml Jumbo / Dropper Bottle",
        sku: "AUR-SRM-50",
        price: "110.00",
        options: { Size: "50ml", Packaging: "Dropper Bottle" },
        imageId: undefined, // VARIANT GAP!
      },
    ],
    jsonLd: {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: "Aura Botanical Barrier Restorative Serum",
      description: "Concentrated lipid-replenishing facial elixir with squalane, blue tansy, and ceramide NP.",
      sku: "AUR-SRM-30",
      mpn: "AUR-BOT-30",
      brand: {
        "@type": "Brand",
        name: "Aura Organics",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "74.00",
        availability: "https://schema.org/InStock",
        url: "https://aura-store.myshopify.com/products/aura-botanical-barrier-restorative-serum",
      },
      image: [
        {
          "@type": "ImageObject",
          contentUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1200&auto=format&fit=crop",
          caption: "Aura serum bottle with dropper",
          encodingFormat: "image/png",
          width: 1500,
          height: 1500,
          name: "Aura Serum 30ml",
        },
      ],
    },
  },
];

// Helper to calculate product and store scores
function computeProductScores(prod: ShopifyProduct) {
  if (prod.images.length === 0) {
    prod.overallSeoScore = 20;
    prod.overallGeoScore = 15;
    return;
  }
  const avgSeo = Math.round(
    prod.images.reduce((acc, img) => acc + img.seoScore, 0) / prod.images.length
  );
  const avgGeo = Math.round(
    prod.images.reduce((acc, img) => acc + img.geoScore, 0) / prod.images.length
  );

  // Variant gap penalty: check if variants have images
  const variantGaps = prod.variants.filter((v) => !v.imageId).length;
  const variantPenalty = Math.min(25, variantGaps * 8);

  prod.overallSeoScore = Math.max(10, Math.min(100, avgSeo - Math.floor(variantPenalty / 2)));
  prod.overallGeoScore = Math.max(10, Math.min(100, avgGeo - Math.floor(variantPenalty / 2)));
}

// Resolves which shop an /api/* request belongs to. Prefers the App Bridge
// ID token (Authorization: Bearer ...) — the real signal for an embedded
// load, since third-party cookies can't be relied on inside the admin
// iframe — and lazily does token exchange + an initial catalog fetch the
// first time a shop is seen this way. Falls back to the cookie-based
// session (plain-browser-tab / demo testing) when there's no Bearer token.
async function resolveShopForRequest(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ") && SHOPIFY_API_KEY && SHOPIFY_API_SECRET) {
    const idToken = authHeader.slice("Bearer ".length);
    const shop = shopify.verifyIdToken(idToken, SHOPIFY_API_KEY, SHOPIFY_API_SECRET);
    if (shop) {
      if (!shopify.shopTokens.has(shop)) {
        try {
          const accessToken = await shopify.exchangeIdTokenForAccessToken(
            shop,
            idToken,
            SHOPIFY_API_KEY,
            SHOPIFY_API_SECRET
          );
          shopify.shopTokens.set(shop, accessToken);
          const [fetchedProducts, info] = await Promise.all([
            shopify.fetchShopProducts(shop, accessToken),
            shopify.fetchShopInfo(shop, accessToken),
          ]);
          shopify.shopProducts.set(shop, fetchedProducts);
          shopify.shopInfo.set(shop, info);
        } catch (err) {
          console.error("Token exchange failed for", shop, err);
          shopify.shopTokens.delete(shop);
          return null;
        }
      }
      return shop;
    }
  }

  if (SHOPIFY_API_SECRET) {
    const cookieShop = shopify.readShopCookie(req.headers.cookie, SHOPIFY_API_SECRET);
    if (cookieShop) return cookieShop;
  }

  return null;
}

function getProductsForRequest(req: express.Request): ShopifyProduct[] {
  const shop = req.res?.locals.shop as string | null | undefined;
  if (shop) {
    const shopProds = shopify.shopProducts.get(shop);
    if (shopProds) return shopProds;
  }
  return products;
}

function computeStoreSummary(productList: ShopifyProduct[]): StoreAuditSummary {
  let totalImages = 0;
  let missingAlt = 0;
  let weakFilename = 0;
  let unassignedVariantGaps = 0;
  let jsonLdIssues = 0;
  let missingTranslations = 0;
  let seoSum = 0;
  let geoSum = 0;

  for (const p of productList) {
    computeProductScores(p);
    seoSum += p.overallSeoScore;
    geoSum += p.overallGeoScore;
    totalImages += p.images.length;

    for (const img of p.images) {
      if (!img.altText || img.altText.trim().length === 0) missingAlt++;
      else if (img.altText.split(" ").length < 3) missingAlt++;

      if (
        img.filename.toLowerCase().startsWith("img_") ||
        img.filename.toLowerCase().startsWith("dsc") ||
        img.filename.toLowerCase().includes("final") ||
        img.filename.toLowerCase().includes("raw")
      ) {
        weakFilename++;
      }

      if (!img.translations.es || !img.translations.fr) {
        missingTranslations++;
      }
    }

    for (const v of p.variants) {
      if (!v.imageId) unassignedVariantGaps++;
    }

    if (!p.jsonLd || p.jsonLd.image.length < p.images.length) {
      jsonLdIssues++;
    }
  }

  const currentSeo = productList.length ? Math.round(seoSum / productList.length) : 0;
  const currentGeo = productList.length ? Math.round(geoSum / productList.length) : 0;

  return {
    totalProducts: productList.length,
    totalImages,
    averageSeoScore: currentSeo,
    averageGeoScore: currentGeo,
    missingAltCount: missingAlt,
    weakFilenameCount: weakFilename,
    unassignedVariantGaps,
    jsonLdIssuesCount: jsonLdIssues,
    missingTranslationsCount: missingTranslations,
    lastStoreAudit: new Date().toISOString(),
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Store products list & store audit summary
app.get("/api/products", (req, res) => {
  const productList = getProductsForRequest(req);
  const summary = computeStoreSummary(productList);
  res.json({
    products: productList,
    summary,
  });
});

// 2. Single product details
app.get("/api/products/:id", (req, res) => {
  const product = getProductsForRequest(req).find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  computeProductScores(product);
  res.json(product);
});

// 3. Apply an ALT text fix to an image
app.post("/api/products/:id/apply-fix", (req, res) => {
  const { imageId, field, value } = req.body;
  const product = getProductsForRequest(req).find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const img = product.images.find((i) => i.id === imageId);
  if (!img) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  if (field === "altText") {
    img.altText = value ?? "";
  }

  res.json(product);
});

// ----------------------------------------------------
// SHOPIFY OAUTH
// ----------------------------------------------------

const SHOP_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24 * 30,
};

// 11. Start OAuth install flow for a shop
app.get("/api/auth", (req, res) => {
  const shop = typeof req.query.shop === "string" ? req.query.shop : null;
  if (!shop || !shopify.isValidShopDomain(shop)) {
    res.status(400).send("Missing or invalid shop parameter.");
    return;
  }
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    res
      .status(500)
      .send("SHOPIFY_API_KEY / SHOPIFY_API_SECRET are not configured on the server.");
    return;
  }

  const state = shopify.generateState();
  res.cookie(shopify.OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });

  const redirectUri = `${SHOPIFY_APP_URL}/api/auth/callback`;
  const authorizeUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${encodeURIComponent(SHOPIFY_API_KEY)}` +
    `&scope=${encodeURIComponent(SHOPIFY_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  res.redirect(authorizeUrl);
});

// 12. OAuth callback: exchange code, cache the real catalog, sign in the shop
app.get("/api/auth/callback", async (req, res) => {
  const shop = typeof req.query.shop === "string" ? req.query.shop : null;
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;

  if (!shop || !code || !shopify.isValidShopDomain(shop)) {
    res.status(400).send("Invalid callback request.");
    return;
  }
  if (!SHOPIFY_API_SECRET || !shopify.verifyHmac(req.query, SHOPIFY_API_SECRET)) {
    res.status(401).send("Invalid request signature.");
    return;
  }

  const cookieState = shopify.readCookie(req.headers.cookie, shopify.OAUTH_STATE_COOKIE);
  if (!state || !cookieState || state !== cookieState) {
    res.status(401).send("Invalid OAuth state.");
    return;
  }

  try {
    const accessToken = await shopify.exchangeCodeForToken(
      shop,
      code,
      SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET
    );
    shopify.shopTokens.set(shop, accessToken);

    const [fetchedProducts, info] = await Promise.all([
      shopify.fetchShopProducts(shop, accessToken),
      shopify.fetchShopInfo(shop, accessToken),
    ]);
    for (const p of fetchedProducts) computeProductScores(p);
    shopify.shopProducts.set(shop, fetchedProducts);
    shopify.shopInfo.set(shop, info);

    res.clearCookie(shopify.OAUTH_STATE_COOKIE);
    res.cookie(
      shopify.SHOP_SESSION_COOKIE,
      shopify.signShopCookie(shop, SHOPIFY_API_SECRET),
      SHOP_COOKIE_OPTIONS
    );
    res.redirect("/");
  } catch (err) {
    console.error("Shopify OAuth callback failed:", err);
    res.status(500).send("Failed to complete Shopify authentication.");
  }
});

// 13. Connected shop info, for nav branding (demo mode when not connected)
app.get("/api/shop", (req, res) => {
  const shop = res.locals.shop as string | null;
  const info = shop ? shopify.shopInfo.get(shop) : null;
  if (!info) {
    res.json({ connected: false });
    return;
  }
  res.json({ connected: true, shopName: info.name, shopDomain: info.domain });
});

// Entry point when the app is opened from the Shopify admin (?shop=...).
// Always renders the app shell — for an embedded app, real authentication
// happens client-side via App Bridge's ID token on the first /api/* call
// (see resolveShopForRequest), not by gating this top-level page load. A
// hard gate here would also be wrong in practice: Shopify's own iframe
// navigation inside the admin SPA doesn't necessarily carry a signed hmac
// on every load the way the old redirect-based flow assumed.
//
// The cookie fallback below (for plain-browser-tab / non-embedded testing)
// stays hmac-gated, since — unlike the page shell — it grants read/write
// access to a specific shop's cached data, so it must only be set from a
// request Shopify actually signed.
app.get("/", (req, res, next) => {
  const shop = typeof req.query.shop === "string" ? req.query.shop : null;
  if (
    shop &&
    SHOPIFY_API_SECRET &&
    shopify.isValidShopDomain(shop) &&
    shopify.verifyHmac(req.query, SHOPIFY_API_SECRET) &&
    shopify.shopTokens.has(shop)
  ) {
    res.cookie(
      shopify.SHOP_SESSION_COOKIE,
      shopify.signShopCookie(shop, SHOPIFY_API_SECRET),
      SHOP_COOKIE_OPTIONS
    );
  }
  next();
});

// Vite middleware / production static handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Next Image Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
