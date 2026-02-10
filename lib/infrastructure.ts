/**
 * Kubernetes Deployment Configuration
 * 
 * Deploy to Kubernetes cluster with:
 * kubectl apply -f kubernetes.yaml
 */

export const KUBERNETES_DEPLOYMENT = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auto-platform
  namespace: production
  labels:
    app: auto-platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: auto-platform
  template:
    metadata:
      labels:
        app: auto-platform
    spec:
      serviceAccountName: auto-platform
      
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      
      containers:
      - name: auto-platform
        image: auto-platform:latest
        imagePullPolicy: Always
        
        # Container security
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        
        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        # Environment variables
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auto-platform-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: auto-platform-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auto-platform-secrets
              key: jwt-secret
        
        # Ports
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        # Temp storage for uploads
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: uploads
          mountPath: /app/uploads
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: uploads
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: auto-platform
  namespace: production
  labels:
    app: auto-platform
spec:
  type: LoadBalancer
  selector:
    app: auto-platform
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  - name: https
    port: 443
    targetPort: http
    protocol: TCP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auto-platform-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auto-platform
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: auto-platform-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: auto-platform

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: auto-platform
  namespace: production
`;

/**
 * Nginx Load Balancer Configuration
 * 
 * Use for non-Kubernetes deployments
 */
export const NGINX_CONFIG = `
upstream auto_platform {
    least_conn;
    server backend1:3000 max_fails=3 fail_timeout=30s;
    server backend2:3000 max_fails=3 fail_timeout=30s;
    server backend3:3000 max_fails=3 fail_timeout=30s;
    
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    listen [::]:80;
    server_name clickanunt.ro www.clickanunt.ro;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name clickanunt.ro www.clickanunt.ro;
    
    # SSL
    ssl_certificate /etc/letsencrypt/live/clickanunt.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clickanunt.ro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Rate limiting
    limit_req zone=general burst=20 nodelay;
    
    # Login endpoint - strict rate limit
    location /api/auth/login {
        limit_req zone=login burst=1 nodelay;
        proxy_pass http://auto_platform;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://auto_platform;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files - long cache
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://auto_platform;
        proxy_cache_valid 7d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Default
    location / {
        proxy_pass http://auto_platform;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\\n";
    }
}
`;

export const AUTOSCALING_CONFIG = {
  minInstances: 3,
  maxInstances: 10,
  targetCPU: 70, // percent
  targetMemory: 80, // percent
  targetLatency: 500, // ms (P95)
  scaleUpThreshold: 80, // percent
  scaleDownThreshold: 20, // percent
  cooldownPeriod: 300, // seconds
};
