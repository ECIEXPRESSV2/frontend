const UserLayout = () => {
    return (
        <div className="min-h-screen flex bg-background">

            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-card p-6 flex flex-col">
                <h2 className="text-2xl font-bold text-primary mb-10">
                    ECIXPRESS
                </h2>

                <nav className="flex flex-col gap-4">
                    <button className="text-left hover:text-primary transition">
                        Dashboard
                    </button>
                    <button className="text-left hover:text-primary transition">
                        Pedidos
                    </button>
                    <button className="text-left hover:text-primary transition">
                        Pagos
                    </button>
                </nav>
            </aside>

            {/* Contenido */}
            <main className="flex-1 relative overflow-hidden">

                {/* Decoración (triángulos estilo Figma) */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-10 left-10 w-6 h-6 border-2 border-primary rotate-45"/>
                    <div className="absolute bottom-20 right-20 w-8 h-8 border-2 border-primary rotate-12"/>
                </div>

                {/* Contenido real */}
                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-6">
                        Bienvenido 👋
                    </h1>

                    <div className="bg-white p-6 rounded-2xl shadow-card">
                        Tu contenido aquí
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserLayout;