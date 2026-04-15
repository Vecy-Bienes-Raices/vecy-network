/**
 * Images Router - tRPC procedures for property image management
 */

import { z } from 'zod';
import { publicProcedure } from '../_core/trpc';
import { storagePut } from '../storage';
import { addPropertyImage, getPropertyImages, deletePropertyImage } from '../db';
import { getDb } from '../db';
import { propertyImages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const imagesRouter = {
  /**
   * Upload image to S3 and save to database
   */
  uploadPropertyImage: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        fileBase64: z.string(), // Base64 encoded file
        fileName: z.string(),
        mimeType: z.string(),
        caption: z.string().optional(),
        isMainImage: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileBase64, 'base64');

        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileKey = `properties/${input.propertyId}/images/${timestamp}-${randomSuffix}-${input.fileName}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // If this is main image, unset other main images
        if (input.isMainImage) {
          const db = await getDb();
          if (db) {
            await db
              .update(propertyImages)
              .set({ isMainImage: false })
              .where(eq(propertyImages.propertyId, input.propertyId));
          }
        }

        // Get current max display order
        const images = await getPropertyImages(input.propertyId);
        const maxOrder = images.length > 0 ? Math.max(...images.map(i => i.displayOrder || 0)) : 0;

        // Save to database
        const result = await addPropertyImage({
          propertyId: input.propertyId,
          imageUrl: url,
          caption: input.caption,
          displayOrder: maxOrder + 1,
          isMainImage: input.isMainImage || false,
          mimeType: input.mimeType,
          fileSize: buffer.length,
        });

        return {
          success: true,
          imageUrl: url,
          message: 'Image uploaded successfully',
        };
      } catch (error) {
        console.error('Image upload error:', error);
        throw new Error(`Failed to upload image: ${error}`);
      }
    }),

  /**
   * Get all images for a property
   */
  getPropertyImages: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      try {
        const images = await getPropertyImages(input.propertyId);

        return {
          success: true,
          images,
          count: images.length,
        };
      } catch (error) {
        throw new Error(`Failed to get property images: ${error}`);
      }
    }),

  /**
   * Delete an image
   */
  deletePropertyImage: publicProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await deletePropertyImage(input.imageId);

        return {
          success: true,
          message: 'Image deleted successfully',
        };
      } catch (error) {
        throw new Error(`Failed to delete image: ${error}`);
      }
    }),

  /**
   * Update image display order
   */
  updateImageOrder: publicProcedure
    .input(
      z.object({
        imageId: z.number(),
        displayOrder: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .update(propertyImages)
          .set({ displayOrder: input.displayOrder })
          .where(eq(propertyImages.id, input.imageId));

        return {
          success: true,
          message: 'Image order updated successfully',
        };
      } catch (error) {
        throw new Error(`Failed to update image order: ${error}`);
      }
    }),

  /**
   * Set main image for property
   */
  setMainImage: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        imageId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Unset all main images for this property
        await db
          .update(propertyImages)
          .set({ isMainImage: false })
          .where(eq(propertyImages.propertyId, input.propertyId));

        // Set the selected image as main
        await db
          .update(propertyImages)
          .set({ isMainImage: true })
          .where(eq(propertyImages.id, input.imageId));

        return {
          success: true,
          message: 'Main image updated successfully',
        };
      } catch (error) {
        throw new Error(`Failed to set main image: ${error}`);
      }
    }),
};
