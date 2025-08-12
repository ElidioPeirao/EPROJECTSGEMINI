import { Express } from "express";
import { storage } from "../storage";

export function setupLessonsMaterialsRoutes(app: Express) {
  // Aulas - CRUD
  app.get("/api/courses/:id/lessons", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const lessons = await storage.getLessonsByCourseId(courseId);
      res.json(lessons);
    } catch (error) {
      console.error("Erro ao buscar aulas do curso:", error);
      res.status(500).json({ error: "Erro ao buscar aulas" });
    }
  });
  
  app.get("/api/courses/:courseId/lessons/:lessonId", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const lesson = await storage.getLessonById(lessonId);
      
      if (!lesson) {
        return res.status(404).json({ error: "Aula não encontrada" });
      }
      
      res.json(lesson);
    } catch (error) {
      console.error("Erro ao buscar aula:", error);
      res.status(500).json({ error: "Erro ao buscar aula" });
    }
  });
  
  app.post("/api/courses/:courseId/lessons", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }
    
    try {
      const courseId = parseInt(req.params.courseId);
      const lesson = {
        ...req.body,
        courseId,
      };
      
      const newLesson = await storage.createLesson(lesson);
      res.status(201).json(newLesson);
    } catch (error) {
      console.error("Erro ao criar aula:", error);
      res.status(500).json({ error: "Erro ao criar aula" });
    }
  });
  
  app.put("/api/courses/:courseId/lessons/:lessonId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }
    
    try {
      const lessonId = parseInt(req.params.lessonId);
      const updatedLesson = await storage.updateLesson(lessonId, req.body);
      
      if (!updatedLesson) {
        return res.status(404).json({ error: "Aula não encontrada" });
      }
      
      res.json(updatedLesson);
    } catch (error) {
      console.error("Erro ao atualizar aula:", error);
      res.status(500).json({ error: "Erro ao atualizar aula" });
    }
  });
  
  app.delete("/api/courses/:courseId/lessons/:lessonId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }
    
    try {
      const lessonId = parseInt(req.params.lessonId);
      const deleted = await storage.deleteLesson(lessonId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Aula não encontrada" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      res.status(500).json({ error: "Erro ao excluir aula" });
    }
  });
  
  // Materiais - CRUD
  app.get("/api/courses/:id/materials", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const materials = await storage.getMaterialsByCourseId(courseId);
      res.json(materials);
    } catch (error) {
      console.error("Erro ao buscar materiais do curso:", error);
      res.status(500).json({ error: "Erro ao buscar materiais" });
    }
  });
  
  app.get("/api/courses/:courseId/materials/:materialId", async (req, res) => {
    try {
      const materialId = parseInt(req.params.materialId);
      const material = await storage.getMaterialById(materialId);
      
      if (!material) {
        return res.status(404).json({ error: "Material não encontrado" });
      }
      
      res.json(material);
    } catch (error) {
      console.error("Erro ao buscar material:", error);
      res.status(500).json({ error: "Erro ao buscar material" });
    }
  });
  
  app.post("/api/courses/:courseId/materials", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }
    
    try {
      const courseId = parseInt(req.params.courseId);
      const material = {
        ...req.body,
        courseId,
      };
      
      const newMaterial = await storage.createMaterial(material);
      res.status(201).json(newMaterial);
    } catch (error) {
      console.error("Erro ao criar material:", error);
      res.status(500).json({ error: "Erro ao criar material" });
    }
  });
  
  app.put("/api/courses/:courseId/materials/:materialId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }
    
    try {
      const materialId = parseInt(req.params.materialId);
      const updatedMaterial = await storage.updateMaterial(materialId, req.body);
      
      if (!updatedMaterial) {
        return res.status(404).json({ error: "Material não encontrado" });
      }
      
      res.json(updatedMaterial);
    } catch (error) {
      console.error("Erro ao atualizar material:", error);
      res.status(500).json({ error: "Erro ao atualizar material" });
    }
  });
  
  app.delete("/api/courses/:courseId/materials/:materialId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }
    
    try {
      const materialId = parseInt(req.params.materialId);
      const deleted = await storage.deleteMaterial(materialId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Material não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir material:", error);
      res.status(500).json({ error: "Erro ao excluir material" });
    }
  });
  
  // Materiais de uma aula específica
  app.get("/api/courses/:courseId/lessons/:lessonId/materials", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const materials = await storage.getMaterialsByLessonId(lessonId);
      res.json(materials);
    } catch (error) {
      console.error("Erro ao buscar materiais da aula:", error);
      res.status(500).json({ error: "Erro ao buscar materiais" });
    }
  });
}