import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Delete orders older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffIso = oneYearAgo.toISOString();

    const result = await base44.asServiceRole.entities.Order.deleteMany({
      created_date: { $lt: cutoffIso },
    });

    console.log(`Cleanup: deleted orders older than ${cutoffIso}`);
    return Response.json({
      success: true,
      cutoff: cutoffIso,
      deleted: true,
    });
  } catch (error) {
    console.error('cleanup-old-orders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}