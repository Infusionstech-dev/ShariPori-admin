import { z } from 'zod';

const money = (message) =>
  z.number({ error: message }).positive(message).max(99999999.99, 'That price is too large');

const variantSchema = z
  .object({
    id: z.number().optional(),
    sizeId: z.number(),
    colorId: z.number(),
    sku: z
      .string()
      .trim()
      .max(60, 'SKU is too long')
      .regex(/^[A-Z0-9-]*$/, 'Use capital letters, numbers and hyphens'),
    price: money('Price must be above 0').nullable(),
    salePrice: money('Sale price must be above 0').nullable(),
    stockQty: z.number({ error: 'Enter the stock' }).int().min(0, 'Stock cannot be negative'),
    lowStockThreshold: z.number({ error: 'Enter a number' }).int().min(0),
    isActive: z.boolean(),
  })
  // A row's own sale price needs the row's own price and must be lower than it.
  .superRefine((row, ctx) => {
    if (row.salePrice === null) {
      return;
    }
    if (row.price === null) {
      ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'Add a price first' });
    } else if (row.salePrice >= row.price) {
      ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'Must be below the price' });
    }
  });

// Mirrors the backend's validation/productValidation.js.
export const productSchema = z
  .object({
    nameEn: z.string().trim().min(2, 'Enter the English name').max(150),
    nameBn: z.string().trim().min(2, 'Enter the Bangla name').max(150),
    categoryId: z.number({ error: 'Choose a category' }),
    fabricId: z.number().nullable(),
    shortDesc: z.string().trim().max(500, 'Keep this under 500 characters'),
    description: z.string().max(60000, 'The description is too long'),
    careInfo: z.string().max(5000, 'Keep this under 5000 characters'),
    matchGroup: z.string().trim().max(100, 'Keep this under 100 characters'),
    basePrice: money('Enter a base price above 0'),
    salePrice: money('Sale price must be above 0').nullable(),
    status: z.enum(['draft', 'active', 'archived']),
    isFeatured: z.boolean(),
    seoTitle: z.string().trim().max(200, 'Keep this under 200 characters'),
    seoDesc: z.string().trim().max(500, 'Keep this under 500 characters'),
    variants: z
      .array(variantSchema)
      .min(1, 'Generate at least one variant')
      .refine(
        (rows) => new Set(rows.map((row) => `${row.sizeId}:${row.colorId}`)).size === rows.length,
        'Each size and colour can only be used once'
      ),
  })
  .refine((values) => values.salePrice === null || values.salePrice < values.basePrice, {
    path: ['salePrice'],
    message: 'Sale price must be less than the base price',
  });

export const EMPTY_PRODUCT = {
  nameEn: '',
  nameBn: '',
  categoryId: undefined,
  fabricId: null,
  shortDesc: '',
  description: '',
  careInfo: '',
  matchGroup: '',
  basePrice: null,
  salePrice: null,
  status: 'draft',
  isFeatured: false,
  seoTitle: '',
  seoDesc: '',
  variants: [],
};

export const toFormValues = (product) => ({
  nameEn: product.nameEn,
  nameBn: product.nameBn,
  categoryId: product.categoryId,
  fabricId: product.fabricId,
  shortDesc: product.shortDesc ?? '',
  description: product.description ?? '',
  careInfo: product.careInfo ?? '',
  matchGroup: product.matchGroup ?? '',
  basePrice: product.basePrice,
  salePrice: product.salePrice,
  status: product.status,
  isFeatured: product.isFeatured,
  seoTitle: product.seoTitle ?? '',
  seoDesc: product.seoDesc ?? '',
  variants: product.variants.map((variant) => ({
    id: variant.id,
    sizeId: variant.sizeId,
    colorId: variant.colorId,
    sku: variant.sku,
    price: variant.price,
    salePrice: variant.salePrice ?? null,
    stockQty: variant.stockQty,
    lowStockThreshold: variant.lowStockThreshold,
    isActive: variant.isActive,
  })),
});

// A blank SKU is left out so the API generates one.
export const toRequestBody = (values) => ({
  ...values,
  type: 'single',
  variants: values.variants.map(({ sku, ...variant }) => (sku ? { ...variant, sku } : variant)),
});

// Which tab holds each field, for the red dots and for jumping to the first error.
export const TAB_FIELDS = {
  basic: [
    'nameEn',
    'nameBn',
    'categoryId',
    'fabricId',
    'shortDesc',
    'description',
    'careInfo',
    'matchGroup',
  ],
  variants: ['variants'],
  pricing: ['basePrice', 'salePrice'],
  seo: ['seoTitle', 'seoDesc'],
};
