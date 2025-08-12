import { Link } from "wouter";
import { FaLinkedinIn, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-ep-black text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="font-bold text-xl">
              <span className="text-ep-orange">E</span>PROJECTS
            </Link>
            <p className="text-sm text-gray-400 mt-1">Soluções em engenharia</p>
          </div>
          <div className="flex space-x-6">
            <a
              href="https://www.linkedin.com/in/elidiopeirao/"
              className="text-gray-400 hover:text-white"
            >
              <FaLinkedinIn />
            </a>
            <a
              href="https://www.instagram.com/elidioprojetos/?igsh=MWs4cXc2dmF1dWp6OA%3D%3D#"
              className="text-gray-400 hover:text-white"
            >
              <FaInstagram />
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} EPROJECTS. Todos os direitos
          reservados.
        </div>
      </div>
    </footer>
  );
}
