# MCP Infra

This directory contains Infrastructure as Code (IaC) for the MCP MVP project using Terraform.

## Infrastructure Diagram (Plain Text)

```
AWS Cloud
└── VPC (10.0.0.0/16)
    ├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)
    │   └── Internet Gateway
    ├── Private Subnets (10.0.101.0/24, 10.0.102.0/24)
    │   └── NAT Gateway
    ├── Security Groups
    │   ├── Allow SSH (restricted)
    │   ├── Allow HTTP (80)
    │   └── Allow HTTPS (443)
    └── ECS Cluster (planned)
        └── ECS Service (planned)
            └── Task Definition (planned)
                └── Container (planned)

Other Resources (planned):
- ECR Repository for Docker images
- IAM Roles & Policies
- CloudWatch Log Group & Alarms
```

## Structure
- `infra/` - Terraform modules and configuration
- `security-groups.tf` - Security group definitions

## Usage

1. Change to the `infra/` directory:
   ```bash
   cd infra
   ```
2. Initialize Terraform:
   ```bash
   terraform init
   ```
3. Plan and apply changes:
   ```bash
   terraform plan
   terraform apply
   ```

## Notes
- State files and plan files are ignored via `.gitignore`.

