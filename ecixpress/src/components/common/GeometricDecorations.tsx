interface Props {
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    color?: "primary" | "secondary" | "white";
    opacity?: number;
}

const getPositionStyles = (position: string) => {
    const positions = {
        "top-left": { top: "2.5rem", left: "2.5rem" },
        "top-right": { top: "2.5rem", right: "2.5rem" },
        "bottom-left": { bottom: "5rem", left: "5rem" },
        "bottom-right": { bottom: "5rem", right: "5rem" },
    };
    return positions[position as keyof typeof positions] || positions["top-right"];
};

const getColorClass = (color: "primary" | "secondary" | "white"): string => {
    const colorClasses = {
        primary: "border-primary",
        secondary: "border-secondary",
        white: "border-white",
    };
    return colorClasses[color];
};

export const SmallSquare = ({
    position = "top-left",
    color = "primary",
    opacity = 0.3,
}: Props) => {
    return (
        <div
            className={`absolute w-6 h-6 border-2 ${getColorClass(color)} rotate-45`}
            style={{ opacity, ...getPositionStyles(position) }}
        />
    );
};

export const LargeSquare = ({
    position = "bottom-right",
    color = "primary",
    opacity = 0.3,
}: Props) => {
    return (
        <div
            className={`absolute w-8 h-8 border-2 ${getColorClass(color)} rotate-12`}
            style={{ opacity, ...getPositionStyles(position) }}
        />
    );
};

const GeometricDecorations = () => {
    return (
        <>
            <SmallSquare position="top-left" color="primary" opacity={0.15} />
            <SmallSquare position="top-right" color="secondary" opacity={0.1} />
            <LargeSquare position="bottom-left" color="primary" opacity={0.1} />
            <LargeSquare position="bottom-right" color="secondary" opacity={0.15} />
        </>
    );
};

export default GeometricDecorations;

