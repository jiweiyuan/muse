import { ProjectsGrid } from "@/app/components/projects/projects-grid"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { ProjectsProvider } from "@/lib/projects/provider"

export const dynamic = "force-dynamic"

export default function ProjectsPage() {
  return (
    <LayoutApp>
      <ProjectsProvider>
        <div>
          <div className="mx-auto max-w-screen-2xl px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Projects</h1>
              <p className="text-muted-foreground">
                All your creative projects in one place
              </p>
            </div>

            {/* Projects Grid - shows all projects without limit */}
            <ProjectsGrid limitRecent={false} />
          </div>
        </div>
      </ProjectsProvider>
    </LayoutApp>
  )
}
