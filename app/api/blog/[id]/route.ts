import { NextRequest, NextResponse } from "next/server";
import { getPublishedBlog } from "@/lib/blogPublic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const blog = await getPublishedBlog(id);

    if (!blog) {
      return NextResponse.json(
        { success: false, error: "Blog no encontrado o no está publicado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener el blog" },
      { status: 500 }
    );
  }
}
