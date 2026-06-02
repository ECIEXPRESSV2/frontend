import { SmallSquare, LargeSquare } from "./GeometricDecorations";

interface Props {
    imageUrl?: string;
    title?: string;
}

const VisualPanel = ({
    imageUrl = "/hero.png",
    title = "ECIXPRESS",
}: Props) => {
    return (
        <div className="hidden lg:flex w-1/2 relative bg-primary items-center justify-center overflow-hidden">
            {/* Forma diagonal de corte */}
            <div className="absolute inset-0 bg-primary clip-diagonal"></div>

            {/* Decoraciones geométricas */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <SmallSquare position="top-left" color="white" />
                <LargeSquare position="bottom-right" color="white" />
            </div>

            {/* Contenido */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8">
                <img
                    src={imageUrl}
                    alt="visual"
                    className="w-full h-auto max-w-md drop-shadow-2xl object-contain"
                    loading="lazy"
                />
                <div className="text-white text-center">
                    <h1 className="text-5xl font-display font-bold mb-2">{title}</h1>
                    <p className="text-lg font-body opacity-90">Plataforma moderna y segura</p>
                </div>
            </div>
        </div>
    );
};

export default VisualPanel;

