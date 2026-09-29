output "vpc_endpoint_id" {
  description = "ID of the Bedrock Runtime VPC endpoint"
  value       = aws_vpc_endpoint.bedrock_runtime.id
}

output "vpc_endpoint_dns_entries" {
  description = "DNS entries for the Bedrock VPC endpoint"
  value       = aws_vpc_endpoint.bedrock_runtime.dns_entry
}

output "bedrock_access_policy_arn" {
  description = "ARN of IAM policy for Bedrock access"
  value       = aws_iam_policy.bedrock_access.arn
}

output "security_group_id" {
  description = "Security group ID for Bedrock endpoint"
  value       = aws_security_group.bedrock_endpoint.id
}
