import { NextRequest, NextResponse } from 'next/server';

import { getAdminUserFromRequest } from '../../../../lib/adminAccess';
import { issueCsrfToken } from '../../../../lib/csrf';

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({
    user: {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    },
  });

  issueCsrfToken(response, request);
  return response;
}
