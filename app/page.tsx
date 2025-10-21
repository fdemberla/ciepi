import { Icon } from "@iconify/react";

export default function Home() {
  return (
    <section id="home-section" className="bg-slateGray dark:bg-gray-900">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 space-x-1 items-center">
          {/* Left Content */}
          <div className="col-span-6 flex flex-col gap-8">
            {/* Badge */}
            <div className="flex gap-2 mx-auto lg:mx-0">
              <Icon
                icon="solar:verified-check-bold"
                className="text-success text-xl inline-block me-2"
              />
              <p className="text-success text-sm font-semibold text-center lg:text-start">
                CIEPI - INADEH
              </p>
            </div>

            {/* Main Heading */}
            <h1 className="text-midnight_text dark:text-white text-4xl sm:text-5xl font-semibold pt-5 lg:pt-0 text-center lg:text-start">
              Centro de Innovación y Emprendimiento Productivo
            </h1>

            {/* Subheading */}
            <h3 className="text-black/70 dark:text-gray-300 text-lg pt-5 lg:pt-0 text-center lg:text-start">
              Fomentar el emprendimiento productivo en el país, ofreciendo
              espacios de coworking, incubación de proyectos, acceso a
              tecnología y capacitación para aprendices, egresados y grupos
              vulnerables.
            </h3>

            {/* CTA Button */}
            <div className="pt-5 lg:pt-0">
              <a
                href="/ciepi/capacitaciones"
                className="inline-flex items-center justify-center gap-3 bg-secondary hover:bg-secondary/90 text-white font-semibold text-lg px-8 py-4 lg:px-10 lg:py-5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl w-full lg:w-auto"
              >
                <Icon
                  icon="solar:diploma-bold"
                  className="text-2xl lg:text-3xl"
                />
                Descubre nuestras capacitaciones
              </a>
            </div>

            {/* Features */}
            <div className="flex items-center justify-between gap-2 pt-10 lg:pt-4 flex-wrap lg:flex-nowrap">
              <div className="flex gap-2 items-center">
                <Icon
                  icon="solar:lightbulb-bolt-bold"
                  className="text-success text-2xl sm:text-3xl"
                />
                <p className="text-sm sm:text-base font-normal text-midnight_text dark:text-white">
                  Innovación
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <Icon
                  icon="solar:case-round-bold"
                  className="text-success text-2xl sm:text-3xl"
                />
                <p className="text-sm sm:text-base font-normal text-midnight_text dark:text-white">
                  Emprendimiento
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <Icon
                  icon="solar:users-group-two-rounded-bold"
                  className="text-success text-2xl sm:text-3xl"
                />
                <p className="text-sm sm:text-base font-normal text-midnight_text dark:text-white">
                  Inclusión
                </p>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="col-span-6 flex justify-center mt-10 lg:mt-0">
            <div className="relative w-full max-w-[500px] h-[400px] lg:h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 dark:from-primary/30 dark:to-secondary/30 rounded-3xl blur-3xl"></div>
              <div className="relative w-full h-full flex items-center justify-center">
                <Icon
                  icon="solar:user-check-bold-duotone"
                  className="text-primary dark:text-primary/80 text-[300px] lg:text-[400px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
