import { HomePage } from "@/app/components/home/home-page"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { ProjectsProvider } from "@/lib/projects/provider"

export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <LayoutApp>
      <ProjectsProvider>
        <HomePage />
      </ProjectsProvider>
    </LayoutApp>
  )
}
