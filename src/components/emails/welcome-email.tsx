import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Link,
  Section,
} from "@react-email/components";

interface WelcomeEmailProps {
  userFirstname: string;
  baseUrl: string;
}

export const WelcomeEmail = ({ userFirstname, baseUrl }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to your new sanctuary for thoughts.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>think in ink.</Heading>
        <Text style={text}>Hi {userFirstname},</Text>
        <Text style={text}>
          Welcome to <strong>withink.</strong>—a private, minimal space designed
          for your mind to breathe. Your sanctuary is now ready.
        </Text>
        <Section style={buttonContainer}>
          <Link href={`${baseUrl}/journal`} style={button}>
            Open Your Journal
          </Link>
        </Section>
        <Text style={footer}>
          If you have any questions, just reply to this email. We&apos;re here
          to help.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold",
  letterSpacing: "-0.5px",
  padding: "0",
  marginBottom: "30px",
};

const text = {
  color: "#444",
  fontSize: "15px",
  lineHeight: "24px",
};

const buttonContainer = {
  padding: "20px 0",
};

const button = {
  backgroundColor: "#000",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  marginTop: "40px",
};
