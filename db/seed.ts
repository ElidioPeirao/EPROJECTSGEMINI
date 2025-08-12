import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { addDays } from "date-fns";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Seeding database...");

    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(schema.users.email, "admin@eprojects.com"),
    });

    if (!existingAdmin) {
      // Create admin user
      const adminUser = await db.insert(schema.users).values({
        username: "admin",
        email: "admin@eprojects.com",
        cpf: "12345678901", // Demo CPF for admin user
        password: await hashPassword("admin123"),
        role: "admin",
      }).returning();
      
      console.log("Admin user created:", adminUser[0].username);
    }

    // Check if basic tools exist
    const existingTools = await db.query.tools.findMany();
    
    if (existingTools.length === 0) {
      // Create default tools
      const basicTools = [
        {
          name: "Calculadora Mecânica",
          description: "Ferramentas de cálculo para projetos mecânicos",
          category: "mechanical",
          accessLevel: "E-BASIC",
          linkType: "internal",
          link: "/tools/mechanical-calculator",
        },
        {
          name: "Calculadora Elétrica",
          description: "Ferramentas de cálculo para projetos elétricos",
          category: "electrical",
          accessLevel: "E-BASIC",
          linkType: "internal",
          link: "/tools/electrical-calculator",
        },
        {
          name: "Análise de Tensões",
          description: "Ferramentas avançadas para análise de tensões",
          category: "mechanical",
          accessLevel: "E-TOOL",
          linkType: "internal",
          link: "/tools/stress-analysis",
        },
        {
          name: "Dimensionamento Avançado",
          description: "Ferramentas para dimensionamento elétrico completo",
          category: "electrical",
          accessLevel: "E-MASTER",
          linkType: "internal",
          link: "/tools/advanced-sizing",
        },
      ];

      const createdTools = await db.insert(schema.tools).values(basicTools).returning();
      
      console.log(`${createdTools.length} default tools created`);
    }

    // Create a demo promo code if none exists
    const existingPromoCodes = await db.query.promoCodes.findFirst({
      where: eq(schema.promoCodes.code, "WELCOME2023"),
    });

    if (!existingPromoCodes) {
      const promoCode = await db.insert(schema.promoCodes).values({
        code: "WELCOME2023",
        days: 30,
        maxUses: 100,
        usedCount: 0,
        isActive: true,
        targetRole: "E-TOOL",
        expiryDate: addDays(new Date(), 90), // Expires in 90 days
      }).returning();
      
      console.log("Demo promo code created:", promoCode[0].code);
    }

    // Verificar se já existem cursos
    const existingCourses = await db.query.courses.findMany();
    
    if (existingCourses.length === 0) {
      // Criar cursos de exemplo
      const demoCourses = [
        {
          title: "Introdução à Engenharia Mecânica",
          description: "Um curso introdutório que aborda os princípios fundamentais da engenharia mecânica, desde conceitos básicos até aplicações práticas. Ideal para iniciantes na área.",
          category: "mechanical",
          instructor: "Prof. Carlos Silva",
          duration: "30 horas",
          level: "beginner",
        },
        {
          title: "Sistemas Elétricos Avançados",
          description: "Este curso cobre os sistemas elétricos modernos e suas aplicações em projetos de grande escala. Oferece conhecimento aprofundado para profissionais da área.",
          category: "electrical",
          instructor: "Profa. Maria Santos",
          duration: "45 horas",
          level: "advanced",
        },
        {
          title: "Processos Têxteis Industriais",
          description: "Uma visão completa dos processos têxteis industriais, desde a seleção de matérias-primas até o acabamento final. Inclui técnicas modernas e sustentáveis.",
          category: "textile",
          instructor: "Dr. Roberto Ferreira",
          duration: "40 horas",
          level: "intermediate",
        },
      ];

      const createdCourses = await db.insert(schema.courses).values(demoCourses).returning();
      console.log(`${createdCourses.length} cursos de demonstração criados`);

      // Criar aulas para os cursos
      for (const course of createdCourses) {
        // Aulas para o curso 1 - Engenharia Mecânica
        if (course.title === "Introdução à Engenharia Mecânica") {
          const mechanicalLessons = [
            {
              courseId: course.id,
              title: "Princípios Básicos da Mecânica",
              description: "Nesta aula, apresentamos os conceitos fundamentais que governam a mecânica e sua aplicação em engenharia.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 1,
            },
            {
              courseId: course.id,
              title: "Materiais e Propriedades",
              description: "Estudo dos principais materiais utilizados em engenharia mecânica e suas propriedades físicas e mecânicas.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 2,
            },
            {
              courseId: course.id,
              title: "Elementos de Máquinas",
              description: "Introdução aos principais elementos de máquinas, como engrenagens, correias, mancais e outros componentes essenciais.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 3,
            },
          ];
          
          const createdMechanicalLessons = await db.insert(schema.lessons).values(mechanicalLessons).returning();
          console.log(`${createdMechanicalLessons.length} aulas criadas para o curso de Engenharia Mecânica`);
          
          // Materiais para o curso de Engenharia Mecânica
          const mechanicalMaterials = [
            {
              courseId: course.id,
              lessonId: createdMechanicalLessons[0].id,
              title: "Apostila - Fundamentos de Mecânica",
              description: "Material essencial com os conceitos básicos da disciplina",
              fileUrl: "https://example.com/files/mecanica-fundamentos.pdf",
              fileType: "pdf",
              iconType: "file",
              downloadable: true,
            },
            {
              courseId: course.id,
              title: "Guia de Referência - Fórmulas Mecânicas",
              description: "Compilação das principais fórmulas utilizadas no curso",
              fileUrl: "https://example.com/files/formulas-mecanicas.pdf",
              fileType: "pdf",
              iconType: "file",
              downloadable: true,
            },
            {
              courseId: course.id,
              lessonId: createdMechanicalLessons[1].id,
              title: "Tabela de Propriedades dos Materiais",
              description: "Referência completa das propriedades dos materiais estudados",
              fileUrl: "https://example.com/files/tabela-materiais.xlsx",
              fileType: "xls",
              iconType: "file",
              downloadable: true,
            },
          ];
          
          await db.insert(schema.materials).values(mechanicalMaterials);
          console.log(`${mechanicalMaterials.length} materiais criados para o curso de Engenharia Mecânica`);
        }
        
        // Aulas para o curso 2 - Sistemas Elétricos
        else if (course.title === "Sistemas Elétricos Avançados") {
          const electricalLessons = [
            {
              courseId: course.id,
              title: "Sistemas de Potência",
              description: "Estudo dos sistemas de geração, transmissão e distribuição de energia elétrica em grande escala.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 1,
            },
            {
              courseId: course.id,
              title: "Proteção de Sistemas Elétricos",
              description: "Técnicas e equipamentos para proteção de sistemas elétricos contra falhas e sobrecarga.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 2,
            },
          ];
          
          const createdElectricalLessons = await db.insert(schema.lessons).values(electricalLessons).returning();
          console.log(`${createdElectricalLessons.length} aulas criadas para o curso de Sistemas Elétricos`);
          
          // Materiais para o curso de Sistemas Elétricos
          const electricalMaterials = [
            {
              courseId: course.id,
              lessonId: createdElectricalLessons[0].id,
              title: "Manual de Sistemas de Potência",
              description: "Guia completo sobre os sistemas modernos de potência",
              fileUrl: "https://example.com/files/manual-potencia.pdf",
              fileType: "pdf",
              iconType: "file",
              downloadable: true,
            },
            {
              courseId: course.id,
              title: "Normas Técnicas - Sistemas Elétricos",
              description: "Compilação das principais normas aplicáveis a sistemas elétricos",
              fileUrl: "https://example.com/files/normas-sistemas-eletricos.pdf",
              fileType: "pdf",
              iconType: "file",
              downloadable: true,
            },
          ];
          
          await db.insert(schema.materials).values(electricalMaterials);
          console.log(`${electricalMaterials.length} materiais criados para o curso de Sistemas Elétricos`);
        }
        
        // Aulas para o curso 3 - Processos Têxteis
        else if (course.title === "Processos Têxteis Industriais") {
          const textileLessons = [
            {
              courseId: course.id,
              title: "Matérias-primas Têxteis",
              description: "Estudo das fibras naturais e sintéticas utilizadas na indústria têxtil.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 1,
            },
            {
              courseId: course.id,
              title: "Processos de Fiação",
              description: "Técnicas e tecnologias empregadas nos processos de fiação industrial.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 2,
            },
            {
              courseId: course.id,
              title: "Tingimento e Acabamento",
              description: "Métodos modernos de tingimento e acabamento têxtil, com foco em sustentabilidade.",
              youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              order: 3,
            },
          ];
          
          const createdTextileLessons = await db.insert(schema.lessons).values(textileLessons).returning();
          console.log(`${createdTextileLessons.length} aulas criadas para o curso de Processos Têxteis`);
          
          // Materiais para o curso de Processos Têxteis
          const textileMaterials = [
            {
              courseId: course.id,
              lessonId: createdTextileLessons[0].id,
              title: "Catálogo de Fibras Têxteis",
              description: "Guia visual das principais fibras utilizadas na indústria",
              fileUrl: "https://example.com/files/catalogo-fibras.pdf",
              fileType: "pdf",
              iconType: "file",
              downloadable: true,
            },
            {
              courseId: course.id,
              title: "Guia de Colorimetria Têxtil",
              description: "Manual de referência para aplicação de cores em tecidos",
              fileUrl: "https://example.com/files/colorimetria-textil.pdf",
              fileType: "pdf",
              iconType: "file",
              downloadable: true,
            },
          ];
          
          await db.insert(schema.materials).values(textileMaterials);
          console.log(`${textileMaterials.length} materiais criados para o curso de Processos Têxteis`);
        }
      }
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
