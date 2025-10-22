"use client";
import React from "react";
import { useRouter } from "next/navigation";
import BlogEditor from "@/components/BlogEditor";

export default function CrearBlogPage() {
  const router = useRouter();

  const handleCancel = () => {
    if (!confirm("¿Estás seguro de que deseas cancelar?")) {
      return;
    }
    router.push("/admin/blog");
  };

  return <BlogEditor mode="create" onCancel={handleCancel} />;
}
