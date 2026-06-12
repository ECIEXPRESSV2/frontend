interface LogoProps {
    className?: string;
    size?: number;
}

const Logo = ({ className = "", size = 80 }: LogoProps) => {
    return (
        <img
            src="/logotipoEcixpress.svg"
            alt="ECIXPRESS Logo"
            className={className}
            style={{ width: size, height: "auto" }}
        />
    );
};

export default Logo;
